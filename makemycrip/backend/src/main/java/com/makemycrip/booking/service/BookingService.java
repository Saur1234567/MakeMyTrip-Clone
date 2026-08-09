package com.makemycrip.booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemycrip.booking.dto.*;
import com.makemycrip.booking.entity.*;
import com.makemycrip.booking.enums.*;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.common.exception.*;
import com.makemycrip.common.util.DateUtil;
import com.makemycrip.hotel.entity.*;
import com.makemycrip.hotel.enums.CancellationPolicy;
import com.makemycrip.hotel.repository.*;
import com.makemycrip.hotel.repository.ReviewRepository;
import com.makemycrip.notification.service.NotificationDispatcher;
import com.makemycrip.payment.service.PaymentService;
import com.makemycrip.pricing.dto.PricingContext;
import com.makemycrip.pricing.dto.PricingResult;
import com.makemycrip.pricing.engine.PricingEngineService;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private static final String PRICE_LOCK_PREFIX = "price_lock:";
    private static final int PRICE_LOCK_TTL_MINUTES = 15;

    private final BookingRepository bookingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final HotelRepository hotelRepository;
    private final RoomInventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final PricingEngineService pricingEngine;
    private final PaymentService paymentService;
    private final NotificationDispatcher notificationDispatcher;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final ReviewRepository reviewRepository;
    private final com.makemycrip.promotion.service.CouponService couponService;

    // ── Add-on unit prices (INR) — must match the frontend ADD_ONS constant ──────
    private static final java.util.Map<com.makemycrip.booking.enums.AddOnType, BigDecimal> ADD_ON_PRICES =
            java.util.Map.of(
                    com.makemycrip.booking.enums.AddOnType.BREAKFAST,         new BigDecimal("350"),
                    com.makemycrip.booking.enums.AddOnType.AIRPORT_TRANSFER,  new BigDecimal("800"),
                    com.makemycrip.booking.enums.AddOnType.AIRPORT_PICKUP,    new BigDecimal("800"),
                    com.makemycrip.booking.enums.AddOnType.AIRPORT_DROP,      new BigDecimal("800"),
                    com.makemycrip.booking.enums.AddOnType.BICYCLE_RENTAL,    new BigDecimal("200"),
                    com.makemycrip.booking.enums.AddOnType.DINNER,            new BigDecimal("600"),
                    com.makemycrip.booking.enums.AddOnType.SPA,               new BigDecimal("1500"),
                    com.makemycrip.booking.enums.AddOnType.EXTRA_BED,         new BigDecimal("1000"),
                    com.makemycrip.booking.enums.AddOnType.LAUNDRY,           new BigDecimal("300")
            );

    @Transactional
    public BookingResponse initiateBooking(String userId, InitiateBookingRequest request,
                                           HttpServletRequest httpRequest) {
        // ── Business-level date validation (Bean Validation @Future removed from DTO) ──
        LocalDate today = LocalDate.now();
        if (request.getCheckIn().isBefore(today)) {
            throw new BusinessLogicException("Check-in date cannot be in the past", "INVALID_DATES");
        }
        if (!request.getCheckOut().isAfter(request.getCheckIn())) {
            throw new BusinessLogicException("Check-out date must be after check-in date", "INVALID_DATES");
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));

        Hotel hotel = hotelRepository.findById(roomType.getHotel().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check availability with retry (null inventory = available, treat as open)
        checkAvailabilityWithRetry(request.getRoomTypeId(), request.getCheckIn(), request.getCheckOut());

        // Calculate pricing
        PricingContext ctx = PricingContext.builder()
                .roomTypeId(request.getRoomTypeId())
                .hotelId(hotel.getId())
                .checkIn(request.getCheckIn())
                .checkOut(request.getCheckOut())
                .adults(request.getAdults())
                .children(request.getChildren())
                .userId(UUID.fromString(userId))
                .loyaltyTier(user.getLoyaltyTier())
                .couponCode(request.getCouponCode())
                .ipAddress(getClientIp(httpRequest))
                .build();

        PricingResult pricing = pricingEngine.calculatePrice(ctx);

        int nights = (int) DateUtil.daysBetween(request.getCheckIn(), request.getCheckOut());

        // ── Compute add-on total so it is included in the stored totalAmount ──────
        BigDecimal addOnTotal = BigDecimal.ZERO;
        if (request.getAddOns() != null) {
            for (InitiateBookingRequest.AddOnRequest ao : request.getAddOns()) {
                if (ao.getQuantity() <= 0) continue;
                try {
                    com.makemycrip.booking.enums.AddOnType type =
                            com.makemycrip.booking.enums.AddOnType.valueOf(ao.getType());
                    BigDecimal unitPrice = ADD_ON_PRICES.getOrDefault(type, BigDecimal.ZERO);
                    addOnTotal = addOnTotal.add(unitPrice.multiply(BigDecimal.valueOf(ao.getQuantity())));
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown add-on type '{}' — skipping", ao.getType());
                }
            }
        }

        BigDecimal grandTotalWithAddOns = pricing.getGrandTotal().add(addOnTotal);

        String bookingRef = generateBookingReference();

        Booking booking = Booking.builder()
                .bookingReference(bookingRef)
                .userId(UUID.fromString(userId))
                .hotelId(hotel.getId())
                .roomTypeId(roomType.getId())
                .status(BookingStatus.PAYMENT_PENDING)
                .checkIn(request.getCheckIn())
                .checkOut(request.getCheckOut())
                .totalNights(nights)
                .adults(request.getAdults())
                .children(request.getChildren())
                .infants(request.getInfants())
                .baseAmount(pricing.getTotalForStay())
                .taxAmount(pricing.getTotalTax())
                .convenienceFee(pricing.getConvenienceFee())
                .totalAmount(grandTotalWithAddOns)
                .specialRequests(request.getSpecialRequests())
                .arrivalTime(request.getArrivalTime())
                .source(BookingSource.WEB)
                .ipAddress(getClientIp(httpRequest))
                .build();

        try {
            booking.setPriceBreakdown(objectMapper.writeValueAsString(pricing));
        } catch (Exception e) {
            log.warn("Could not serialize price breakdown: {}", e.getMessage());
        }

        Booking saved = bookingRepository.save(booking);

        // Save primary guest from form submission
        if (request.getPrimaryGuest() != null) {
            InitiateBookingRequest.PrimaryGuestRequest pg = request.getPrimaryGuest();
            BookingGuest primaryGuest = BookingGuest.builder()
                    .booking(saved)
                    .guestType(com.makemycrip.booking.enums.GuestType.ADULT)
                    .isPrimary(true)
                    .firstName(pg.getFirstName())
                    .lastName(pg.getLastName())
                    .email(pg.getEmail())
                    .phone(pg.getPhone())
                    .build();
            saved.getGuests().add(primaryGuest);
        }

        // Save additional guests
        if (request.getAdditionalGuests() != null) {
            for (GuestRequest ag : request.getAdditionalGuests()) {
                if (ag.getFirstName() == null || ag.getFirstName().isBlank()) continue;
                com.makemycrip.booking.enums.GuestType guestType;
                try {
                    guestType = com.makemycrip.booking.enums.GuestType.valueOf(ag.getGuestType());
                } catch (Exception e) {
                    guestType = com.makemycrip.booking.enums.GuestType.ADULT;
                }
                BookingGuest guest = BookingGuest.builder()
                        .booking(saved)
                        .guestType(guestType)
                        .isPrimary(false)
                        .firstName(ag.getFirstName())
                        .lastName(ag.getLastName())
                        .email(ag.getEmail())
                        .phone(ag.getPhone())
                        .build();
                saved.getGuests().add(guest);
            }
        }

        // ── Save add-ons ──────────────────────────────────────────────────────────
        if (request.getAddOns() != null) {
            for (InitiateBookingRequest.AddOnRequest ao : request.getAddOns()) {
                if (ao.getQuantity() <= 0) continue;
                com.makemycrip.booking.enums.AddOnType addOnType;
                try {
                    addOnType = com.makemycrip.booking.enums.AddOnType.valueOf(ao.getType());
                } catch (IllegalArgumentException e) {
                    log.warn("Skipping unknown add-on type '{}' for booking {}", ao.getType(), bookingRef);
                    continue;
                }
                BigDecimal unitPrice = ADD_ON_PRICES.getOrDefault(addOnType, BigDecimal.ZERO);
                BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(ao.getQuantity()));
                BookingAddOn addOn = BookingAddOn.builder()
                        .booking(saved)
                        .addOnType(addOnType)
                        .description(addOnType.name().replace('_', ' '))
                        .quantity(ao.getQuantity())
                        .unitPrice(unitPrice)
                        .totalPrice(totalPrice)
                        .status(com.makemycrip.booking.enums.AddOnStatus.PENDING)
                        .build();
                saved.getAddOns().add(addOn);
            }
        }

        saved = bookingRepository.save(saved);

        // Cache price lock for 15 minutes (non-fatal if Redis is unavailable)
        try {
            String priceLockKey = PRICE_LOCK_PREFIX + saved.getId();
            redisTemplate.opsForValue().set(priceLockKey, grandTotalWithAddOns,
                    PRICE_LOCK_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception redisEx) {
            log.warn("Redis unavailable – price lock not cached for booking {}: {}",
                    saved.getId(), redisEx.getMessage());
        }

        // Create Stripe PaymentIntent with the full amount including add-ons
        String clientSecret = null;
        try {
            clientSecret = paymentService.createPaymentIntent(saved.getId(),
                    grandTotalWithAddOns, "INR", user.getEmail());
        } catch (Exception stripeEx) {
            log.warn("Stripe PaymentIntent creation failed for booking {}: {}",
                    saved.getId(), stripeEx.getMessage());
            // clientSecret remains null; frontend will handle missing secret gracefully
        }

        log.info("Booking initiated: ref={} userId={} hotelId={} addOnTotal={}",
                bookingRef, userId, hotel.getId(), addOnTotal);
        return mapToResponse(saved, hotel, roomType, clientSecret);
    }

    @Transactional
    public BookingResponse confirmBooking(UUID bookingId, String stripePaymentIntentId,
                                          String couponCode, String userId) {
        Booking booking = getBookingById(bookingId);
        if (booking.getStatus() != BookingStatus.PAYMENT_PENDING) {
            throw new BusinessLogicException("Booking is not in PAYMENT_PENDING state", "INVALID_STATE");
        }

        // Apply coupon discount atomically within this transaction so it is
        // persisted on the same entity instance that gets saved below.
        if (couponCode != null && !couponCode.isBlank()) {
            try {
                BigDecimal discount = couponService.redeemForBooking(couponCode, bookingId, userId);
                booking.setCouponCode(couponCode);
                booking.setCouponDiscount(discount);
                // Subtract the coupon discount from the total amount so the confirmed
                // booking reflects the actual amount charged.
                if (discount != null && discount.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal newTotal = booking.getTotalAmount().subtract(discount);
                    if (newTotal.compareTo(BigDecimal.ZERO) < 0) newTotal = BigDecimal.ZERO;
                    booking.setTotalAmount(newTotal);
                }
                log.info("Coupon {} redeemed for booking {} — discount ₹{}, new total ₹{}",
                        couponCode, booking.getBookingReference(), discount, booking.getTotalAmount());
            } catch (Exception e) {
                log.warn("Coupon redemption failed at confirm for booking {}: {}", booking.getBookingReference(), e.getMessage());
            }
        }

        // Decrement inventory with pessimistic lock and retry
        int updated = 0;
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            updated = inventoryRepository.decrementInventory(
                    booking.getRoomTypeId(), booking.getCheckIn(), booking.getCheckOut());
            if (updated > 0) break;
            if (i < maxRetries - 1) {
                try { Thread.sleep((long) Math.pow(2, i) * 100); }
                catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            }
        }
        if (updated == 0) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelledBy(CancelledBy.SYSTEM);
            booking.setCancellationReason("Inventory unavailable after payment");
            bookingRepository.save(booking);
            throw new InventoryUnavailableException("Sorry, this room is no longer available. A full refund will be issued.");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(LocalDateTime.now());

        // Loyalty points: 1 point per ₹100 spent
        int points = booking.getTotalAmount().intValue() / 100;
        booking.setLoyaltyPointsEarned(points);
        bookingRepository.save(booking);

        // Add loyalty points to user
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        if (user != null) {
            user.setLoyaltyPoints(user.getLoyaltyPoints() + points);
            updateLoyaltyTier(user);
            userRepository.save(user);
        }

        // Evict price lock (non-fatal if Redis is unavailable)
        try {
            redisTemplate.delete(PRICE_LOCK_PREFIX + bookingId);
        } catch (Exception redisEx) {
            log.warn("Redis unavailable – could not evict price lock for booking {}: {}",
                    bookingId, redisEx.getMessage());
        }

        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        notificationDispatcher.sendBookingConfirmation(
                user != null ? user.getEmail() : "", user != null ? user.getFirstName() : "",
                booking.getBookingReference(), booking, booking.getUserId());

        log.info("Booking confirmed: ref={} bookingId={}", booking.getBookingReference(), bookingId);
        RoomType roomType = roomTypeRepository.findById(booking.getRoomTypeId()).orElse(null);
        return mapToResponse(booking, hotel, roomType, null);
    }

    public CancellationPreviewDto getCancellationPreview(String userId, String bookingRef) {
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        validateBookingOwner(booking, userId);

        Hotel hotel = hotelRepository.findById(booking.getHotelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        int daysBeforeCheckIn = (int) DateUtil.daysBetween(LocalDate.now(), booking.getCheckIn());
        BigDecimal totalPaid = booking.getTotalAmount();
        BigDecimal[] refundInfo = calculateRefund(hotel.getCancellationPolicy(), daysBeforeCheckIn, totalPaid);

        return CancellationPreviewDto.builder()
                .bookingReference(bookingRef)
                .totalPaid(totalPaid)
                .refundAmount(refundInfo[0])
                .penaltyAmount(refundInfo[1])
                .cancellationPolicy(hotel.getCancellationPolicy().name())
                .refundMessage(buildRefundMessage(refundInfo[0], totalPaid, daysBeforeCheckIn))
                .daysBeforeCheckIn(daysBeforeCheckIn)
                .build();
    }

    @Transactional
    public BookingResponse cancelBooking(String userId, String bookingRef, CancellationRequest request) {
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        validateBookingOwner(booking, userId);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BusinessLogicException("Booking is already cancelled");
        }
        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            throw new BusinessLogicException("Cannot cancel a checked-in booking");
        }

        // Capture original status BEFORE changing it — needed for inventory restore decision
        BookingStatus originalStatus = booking.getStatus();

        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        int daysBeforeCheckIn = (int) DateUtil.daysBetween(LocalDate.now(), booking.getCheckIn());
        BigDecimal[] refundInfo = hotel != null
                ? calculateRefund(hotel.getCancellationPolicy(), daysBeforeCheckIn, booking.getTotalAmount())
                : new BigDecimal[]{BigDecimal.ZERO, booking.getTotalAmount()};

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelledBy(CancelledBy.USER);
        booking.setCancellationReason(request.getReason());
        bookingRepository.save(booking);

        // Restore inventory only if booking was CONFIRMED or CHECKED_IN (inventory was decremented)
        if (originalStatus == BookingStatus.CONFIRMED || originalStatus == BookingStatus.CHECKED_IN) {
            inventoryRepository.incrementInventory(
                    booking.getRoomTypeId(), booking.getCheckIn(), booking.getCheckOut());
        }

        // Process refund
        if (refundInfo[0].compareTo(BigDecimal.ZERO) > 0) {
            paymentService.processRefund(booking.getId(), refundInfo[0], request.getReason(), userId);
        }

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        if (user != null) {
            notificationDispatcher.sendCancellationEmail(
                    user.getEmail(), user.getFirstName(), bookingRef, refundInfo[0], booking.getUserId());
        }

        log.info("Booking cancelled: ref={} userId={}", bookingRef, userId);
        RoomType roomType = roomTypeRepository.findById(booking.getRoomTypeId()).orElse(null);
        return mapToResponse(booking, hotel, roomType, null);
    }

    public Page<BookingResponse> getUserBookings(String userId, String statusParam, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("bookedAt").descending());
        Page<Booking> bookings;
        if (statusParam != null && !statusParam.isBlank()) {
            // Support comma-separated status values (e.g. "CONFIRMED,PENDING,CHECKED_IN")
            List<BookingStatus> statuses = java.util.Arrays.stream(statusParam.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(s -> {
                        try { return BookingStatus.valueOf(s); }
                        catch (IllegalArgumentException e) { return null; }
                    })
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
            if (statuses.size() == 1) {
                bookings = bookingRepository.findByUserIdAndStatusOrderByBookedAtDesc(
                        UUID.fromString(userId), statuses.get(0), pageable);
            } else if (statuses.size() > 1) {
                bookings = bookingRepository.findByUserIdAndStatusInOrderByBookedAtDesc(
                        UUID.fromString(userId), statuses, pageable);
            } else {
                bookings = bookingRepository.findByUserIdOrderByBookedAtDesc(UUID.fromString(userId), pageable);
            }
        } else {
            bookings = bookingRepository.findByUserIdOrderByBookedAtDesc(UUID.fromString(userId), pageable);
        }
        return bookings.map(b -> {
            Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
            RoomType roomType = roomTypeRepository.findById(b.getRoomTypeId()).orElse(null);
            return mapToResponse(b, hotel, roomType, null);
        });
    }

    public BookingResponse getBookingDetail(String userId, String bookingRef) {
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        validateBookingOwner(booking, userId);
        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        RoomType roomType = roomTypeRepository.findById(booking.getRoomTypeId()).orElse(null);

        // For PAYMENT_PENDING bookings, retrieve the clientSecret from Stripe so the
        // payment page can use it directly without creating a duplicate PaymentIntent.
        String clientSecret = null;
        if (booking.getStatus() == BookingStatus.PAYMENT_PENDING) {
            clientSecret = paymentService.getClientSecretForBooking(booking.getId());
        }
        return mapToResponse(booking, hotel, roomType, clientSecret);
    }

    private BigDecimal[] calculateRefund(CancellationPolicy policy, int daysBeforeCheckIn, BigDecimal totalPaid) {
        BigDecimal refund = switch (policy) {
            case FLEXIBLE -> totalPaid;
            case MODERATE -> {
                if (daysBeforeCheckIn >= 5) yield totalPaid;
                else if (daysBeforeCheckIn >= 2) yield totalPaid.multiply(new BigDecimal("0.5"));
                else yield BigDecimal.ZERO;
            }
            case STRICT -> {
                if (daysBeforeCheckIn >= 7) yield totalPaid.multiply(new BigDecimal("0.5"));
                else yield BigDecimal.ZERO;
            }
            case NON_REFUNDABLE -> BigDecimal.ZERO;
        };
        return new BigDecimal[]{refund, totalPaid.subtract(refund)};
    }

    private String buildRefundMessage(BigDecimal refund, BigDecimal total, int days) {
        if (refund.compareTo(total) == 0) return "Full refund of ₹" + total + " will be processed";
        if (refund.compareTo(BigDecimal.ZERO) == 0) return "No refund applicable per hotel policy";
        return "Partial refund of ₹" + refund + " will be processed (₹" + total.subtract(refund) + " penalty)";
    }

    private void checkAvailabilityWithRetry(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            Integer available = inventoryRepository.findMinAvailableRooms(roomTypeId, checkIn, checkOut);
            // null means no inventory rows exist for this date range — the V8 migration
            // extends inventory to 730 days, but as a safety net we treat null as
            // "available" (open inventory) rather than blocking the booking.
            if (available == null || available > 0) return;
            if (i < maxRetries - 1) {
                try { Thread.sleep((long) Math.pow(2, i) * 100); }
                catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            }
        }
        throw new InventoryUnavailableException(
                "Selected room type is not available for the selected dates", "INVENTORY_UNAVAILABLE");
    }

    private void validateBookingOwner(Booking booking, String userId) {
        if (!booking.getUserId().toString().equals(userId)) {
            throw new com.makemycrip.common.exception.BusinessLogicException("Access denied: not your booking", "FORBIDDEN");
        }
    }

    private void updateLoyaltyTier(User user) {
        int points = user.getLoyaltyPoints();
        if (points >= 10000) user.setLoyaltyTier(com.makemycrip.user.enums.LoyaltyTier.PLATINUM);
        else if (points >= 5000) user.setLoyaltyTier(com.makemycrip.user.enums.LoyaltyTier.GOLD);
        else if (points >= 1000) user.setLoyaltyTier(com.makemycrip.user.enums.LoyaltyTier.SILVER);
    }

    private String generateBookingReference() {
        return "MMC" + System.currentTimeMillis() % 1000000000L;
    }

    private Booking getBookingById(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
    }

    private BookingResponse mapToResponse(Booking booking, Hotel hotel, RoomType roomType, String clientSecret) {
        String hotelPrimaryImage = hotel != null && !hotel.getImages().isEmpty()
                ? hotel.getImages().stream().filter(i -> Boolean.TRUE.equals(i.getIsPrimary()))
                    .findFirst().map(HotelImage::getImageUrl)
                    .orElse(hotel.getImages().get(0).getImageUrl())
                : null;

        List<BookingResponse.GuestDto> guestDtos = booking.getGuests().stream()
                .map(g -> BookingResponse.GuestDto.builder()
                        .id(g.getId())
                        .guestType(g.getGuestType() != null ? g.getGuestType().name() : null)
                        .isPrimary(g.getIsPrimary())
                        .title(g.getTitle())
                        .firstName(g.getFirstName())
                        .lastName(g.getLastName())
                        .email(g.getEmail())
                        .phone(g.getPhone())
                        .nationality(g.getNationality())
                        .idType(g.getIdType() != null ? g.getIdType().name() : null)
                        .build())
                .collect(Collectors.toList());

        List<BookingResponse.AddOnDto> addOnDtos = booking.getAddOns().stream()
                .map(a -> BookingResponse.AddOnDto.builder()
                        .id(a.getId())
                        .addOnType(a.getAddOnType() != null ? a.getAddOnType().name() : null)
                        .description(a.getDescription())
                        .quantity(a.getQuantity())
                        .unitPrice(a.getUnitPrice())
                        .totalPrice(a.getTotalPrice())
                        .status(a.getStatus() != null ? a.getStatus().name() : null)
                        .build())
                .collect(Collectors.toList());

        // Primary guest details
        BookingResponse.GuestDto primaryGuest = guestDtos.stream()
                .filter(g -> Boolean.TRUE.equals(g.getIsPrimary()))
                .findFirst()
                .orElse(guestDtos.isEmpty() ? null : guestDtos.get(0));

        String primaryGuestName = primaryGuest != null
                ? ((primaryGuest.getFirstName() != null ? primaryGuest.getFirstName() : "") + " "
                   + (primaryGuest.getLastName() != null ? primaryGuest.getLastName() : "")).trim()
                : null;

        // Add-on total
        BigDecimal addOnAmount = addOnDtos.stream()
                .map(a -> a.getTotalPrice() != null ? a.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Price lock expiry — bookedAt + 15 minutes (Redis TTL may have already expired)
        LocalDateTime priceLockExpiresAt = booking.getBookedAt() != null
                ? booking.getBookedAt().plusMinutes(PRICE_LOCK_TTL_MINUTES)
                : null;

        // Has review
        boolean hasReview = reviewRepository.existsByBookingId(booking.getId());

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingReference(booking.getBookingReference())
                .status(booking.getStatus().name())
                .hotelName(hotel != null ? hotel.getName() : null)
                .hotelCity(hotel != null ? hotel.getCity() : null)
                .hotelImageUrl(hotelPrimaryImage)
                .hotelAddress(hotel != null ? hotel.getAddressLine1() : null)
                .hotelPhone(hotel != null ? hotel.getPrimaryPhone() : null)
                .hotelId(booking.getHotelId())
                .roomTypeName(roomType != null ? roomType.getName() : null)
                .checkIn(booking.getCheckIn())
                .checkOut(booking.getCheckOut())
                .totalNights(booking.getTotalNights())
                .adults(booking.getAdults())
                .children(booking.getChildren())
                .baseAmount(booking.getBaseAmount())
                .discountAmount(booking.getDiscountAmount())
                .taxAmount(booking.getTaxAmount())
                .convenienceFee(booking.getConvenienceFee())
                .addOnAmount(addOnAmount)
                .totalAmount(booking.getTotalAmount())
                .currency(booking.getCurrency())
                .couponCode(booking.getCouponCode())
                .couponDiscount(booking.getCouponDiscount())
                .specialRequests(booking.getSpecialRequests())
                .arrivalTime(booking.getArrivalTime())
                .earlyCheckinRequested(booking.getEarlyCheckinRequested())
                .lateCheckoutRequested(booking.getLateCheckoutRequested())
                .earlyCheckinApproved(booking.getEarlyCheckinApproved())
                .lateCheckoutApproved(booking.getLateCheckoutApproved())
                .priceBreakdown(parsePriceBreakdown(booking.getPriceBreakdown()))
                .bookedAt(booking.getBookedAt())
                .confirmedAt(booking.getConfirmedAt())
                .cancelledAt(booking.getCancelledAt())
                .cancellationReason(booking.getCancellationReason())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .loyaltyPointsEarned(booking.getLoyaltyPointsEarned())
                .cancellationPolicy(hotel != null && hotel.getCancellationPolicy() != null
                        ? hotel.getCancellationPolicy().name() : null)
                .checkInTime(hotel != null && hotel.getCheckinTime() != null
                        ? hotel.getCheckinTime().toString() : null)
                .checkOutTime(hotel != null && hotel.getCheckoutTime() != null
                        ? hotel.getCheckoutTime().toString() : null)
                .priceLockExpiresAt(priceLockExpiresAt)
                .hasReview(hasReview)
                .primaryGuestName(primaryGuestName)
                .guestEmail(primaryGuest != null ? primaryGuest.getEmail() : null)
                .guestPhone(primaryGuest != null ? primaryGuest.getPhone() : null)
                .guests(guestDtos)
                .addOns(addOnDtos)
                .paymentIntentClientSecret(clientSecret)
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePriceBreakdown(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            log.warn("Failed to parse priceBreakdown JSON: {}", e.getMessage());
            return null;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) return xForwardedFor.split(",")[0].trim();
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null ? realIp : request.getRemoteAddr();
    }
}
