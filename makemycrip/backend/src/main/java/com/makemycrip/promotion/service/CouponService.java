package com.makemycrip.promotion.service;

import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.common.exception.BusinessLogicException;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import com.makemycrip.promotion.dto.CouponValidateRequest;
import com.makemycrip.promotion.dto.CouponValidateResponse;
import com.makemycrip.promotion.entity.CouponCode;
import com.makemycrip.promotion.entity.CouponUserUsage;
import com.makemycrip.promotion.entity.Promotion;
import com.makemycrip.promotion.repository.CouponCodeRepository;
import com.makemycrip.promotion.repository.CouponUserUsageRepository;
import com.makemycrip.promotion.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CouponService {

    private final CouponCodeRepository couponCodeRepository;
    private final PromotionRepository promotionRepository;
    private final CouponUserUsageRepository couponUserUsageRepository;
    private final BookingRepository bookingRepository;
    private final RoomTypeRepository roomTypeRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validates a coupon code for a given booking + payment context.
     * Throws {@link BusinessLogicException} with a user-friendly message on any failure.
     * Never trusts any discount value from the client — always recomputes from DB.
     *
     * Validation sequence:
     *   1. Existence check
     *   2. Active status
     *   3. Date validity
     *   4. Scope match (UNIVERSAL / HOTEL / CITY / ROOM_TYPE)
     *   5. Minimum booking amount
     *   6. Global usage limit
     *   7. Per-user usage limit
     *   8. Payment method restriction
     *   9. Bank restriction
     *  10. Wallet restriction
     *  11. UPI app restriction
     *
     * @param request  the validate request from the frontend
     * @param userId   the authenticated user's ID (from JWT)
     * @return         validated discount details computed server-side
     */
    public CouponValidateResponse validate(CouponValidateRequest request, String userId) {
        String code = request.getCode().trim().toUpperCase();

        // 1. Look up the coupon code row
        CouponCode couponCode = couponCodeRepository.findByCode(code)
                .orElseThrow(() -> new BusinessLogicException("Invalid coupon code: " + code, "INVALID_COUPON"));

        // 2. Look up the associated promotion
        Promotion promo = promotionRepository.findById(couponCode.getPromotionId())
                .orElseThrow(() -> new BusinessLogicException("Coupon promotion not found", "INVALID_COUPON"));

        // 3. Look up the booking to get the authoritative total amount
        Booking booking = bookingRepository.findByBookingReference(request.getBookingRef())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.getBookingRef()));

        BigDecimal totalAmount = booking.getTotalAmount();

        // Resolve booking context for scope checks (prefer request fields, fall back to booking)
        UUID hotelId = request.getHotelId() != null ? request.getHotelId() : booking.getHotelId();
        String city = resolveCity(request.getCity(), booking);
        String roomTypeName = resolveRoomType(request.getRoomType(), booking);

        // 4. Run all validation checks in sequence
        assertActive(promo);
        assertNotExpired(promo);
        assertScope(promo, hotelId, city, roomTypeName);
        assertMinAmount(promo, totalAmount);
        assertTotalUsageLimit(promo);
        assertPerUserLimit(promo, userId);
        assertPaymentMethod(promo, request.getPaymentMethod());
        assertBank(promo, request.getSelectedBank());
        assertWallet(promo, request.getSelectedWallet());
        assertUpiApp(promo, request.getSelectedUpiApp());

        // 5. Compute discount server-side
        BigDecimal discountAmount = computeDiscount(promo, totalAmount);
        BigDecimal finalAmount = totalAmount.subtract(discountAmount).max(BigDecimal.ZERO);

        log.info("Coupon {} validated for booking {} — scope={} discount=₹{}",
                code, request.getBookingRef(), promo.getScope(), discountAmount);

        return buildResponse(promo, code, discountAmount, totalAmount, finalAmount);
    }

    /**
     * Returns all coupons that are potentially applicable for the given booking context.
     * Used by GET /api/v1/coupons/available to populate the coupon suggestion list.
     *
     * Filters:
     *  - is_active = true
     *  - valid_from <= NOW() <= valid_until
     *  - scope matches (UNIVERSAL always included; HOTEL/CITY/ROOM_TYPE only if context matches)
     *  - global usage limit not exhausted
     *  - per-user limit not exhausted
     *
     * Does NOT filter by payment method (shown to user before they select a method).
     * Does NOT compute exact discount (uses booking total for estimate).
     *
     * @param bookingRef  booking reference to load context
     * @param userId      authenticated user ID
     * @return            list of applicable coupon responses (discount estimated from booking total)
     */
    public List<CouponValidateResponse> getAvailableCoupons(String bookingRef, String userId) {
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingRef));

        String city = resolveCity(null, booking);
        String roomTypeName = resolveRoomType(null, booking);
        UUID hotelId = booking.getHotelId();
        BigDecimal totalAmount = booking.getTotalAmount();
        LocalDateTime now = LocalDateTime.now();

        // Load all active, non-expired promotions of type COUPON
        List<Promotion> allPromos = promotionRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsActive()))
                .filter(p -> "COUPON".equalsIgnoreCase(p.getPromotionType()))
                .filter(p -> p.getValidFrom() == null || !now.isBefore(p.getValidFrom()))
                .filter(p -> p.getValidUntil() == null || !now.isAfter(p.getValidUntil()))
                .filter(p -> p.getTotalUsageLimit() == null || p.getCurrentUsage() < p.getTotalUsageLimit())
                .collect(Collectors.toList());

        return allPromos.stream()
                .filter(p -> isScopeMatch(p, hotelId, city, roomTypeName))
                .filter(p -> isMinAmountMet(p, totalAmount))
                .filter(p -> isPerUserLimitOk(p, userId))
                .map(p -> {
                    // Find the coupon code for this promotion
                    return couponCodeRepository.findByPromotionIdOrderByCreatedAtDesc(p.getId()).stream()
                            .filter(cc -> !Boolean.TRUE.equals(cc.getIsUsed()))
                            .findFirst()
                            .map(cc -> {
                                BigDecimal discount = computeDiscount(p, totalAmount);
                                BigDecimal finalAmt = totalAmount.subtract(discount).max(BigDecimal.ZERO);
                                return buildResponse(p, cc.getCode(), discount, totalAmount, finalAmt);
                            })
                            .orElse(null);
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());
    }

    /**
     * Re-validates and redeems a coupon at the time of payment confirmation.
     * This is the second validation gate — prevents replay attacks and race conditions.
     * Called from PaymentController after Stripe confirms payment.
     *
     * @param code      coupon code (may be null — booking proceeds without discount)
     * @param bookingId the booking UUID
     * @param userId    the authenticated user's ID
     * @return          the server-computed discount amount (0 if no coupon)
     */
    @Transactional
    public BigDecimal redeemForBooking(String code, UUID bookingId, String userId) {
        if (code == null || code.isBlank()) return BigDecimal.ZERO;

        String normalised = code.trim().toUpperCase();
        CouponCode couponCode = couponCodeRepository.findByCode(normalised)
                .orElseThrow(() -> new BusinessLogicException("Invalid coupon code: " + normalised, "INVALID_COUPON"));

        Promotion promo = promotionRepository.findById(couponCode.getPromotionId())
                .orElseThrow(() -> new BusinessLogicException("Coupon promotion not found", "INVALID_COUPON"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        // Guard: already redeemed for this booking?
        if (couponUserUsageRepository.existsByPromotionIdAndBookingId(promo.getId(), bookingId)) {
            log.warn("Coupon {} already redeemed for booking {}", normalised, bookingId);
            return BigDecimal.ZERO;
        }

        // Re-run core validation checks (replay attack / race condition guard)
        assertActive(promo);
        assertNotExpired(promo);
        assertMinAmount(promo, booking.getTotalAmount());
        assertTotalUsageLimit(promo);
        assertPerUserLimit(promo, userId);

        BigDecimal discountAmount = computeDiscount(promo, booking.getTotalAmount());

        // Mark usage
        couponUserUsageRepository.save(CouponUserUsage.builder()
                .promotionId(promo.getId())
                .userId(UUID.fromString(userId))
                .bookingId(bookingId)
                .build());

        // Increment global usage counter
        promo.setCurrentUsage(promo.getCurrentUsage() + 1);
        promotionRepository.save(promo);

        // Mark single-use coupon code as used
        if (Boolean.TRUE.equals(couponCode.getIsSingleUse())) {
            couponCode.setIsUsed(true);
            couponCode.setUsedBy(UUID.fromString(userId));
            couponCode.setUsedAt(LocalDateTime.now());
            couponCode.setBookingId(bookingId);
            couponCodeRepository.save(couponCode);
        }

        log.info("Coupon {} redeemed for booking {} — discount ₹{}", normalised, bookingId, discountAmount);
        return discountAmount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scope helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String resolveCity(String requestCity, Booking booking) {
        if (requestCity != null && !requestCity.isBlank()) return requestCity;
        // Try to get city from booking's hotel (loaded lazily via hotel service if needed)
        // For now we rely on the request field; if null, scope check will be lenient
        return null;
    }

    private String resolveRoomType(String requestRoomType, Booking booking) {
        if (requestRoomType != null && !requestRoomType.isBlank()) return requestRoomType;
        // Try to resolve from booking's roomTypeId
        if (booking.getRoomTypeId() != null) {
            return roomTypeRepository.findById(booking.getRoomTypeId())
                    .map(RoomType::getName)
                    .orElse(null);
        }
        return null;
    }

    /**
     * Asserts that the coupon's scope matches the booking context.
     * Throws BusinessLogicException if the scope does not match.
     */
    private void assertScope(Promotion promo, UUID hotelId, String city, String roomTypeName) {
        String scope = promo.getScope();
        if (scope == null || "UNIVERSAL".equalsIgnoreCase(scope)) return;

        switch (scope.toUpperCase()) {
            case "HOTEL":
                if (promo.getHotelId() == null) return; // misconfigured — allow
                if (hotelId == null || !promo.getHotelId().equals(hotelId)) {
                    throw new BusinessLogicException(
                            "This coupon is only valid for a specific hotel.",
                            "COUPON_WRONG_HOTEL");
                }
                break;

            case "CITY":
                if (promo.getCity() == null || promo.getCity().isBlank()) return;
                if (city == null || !promo.getCity().trim().equalsIgnoreCase(city.trim())) {
                    throw new BusinessLogicException(
                            "This coupon is only valid for bookings in " + promo.getCity() + ".",
                            "COUPON_WRONG_CITY");
                }
                break;

            case "ROOM_TYPE":
                if (promo.getRoomType() == null || promo.getRoomType().isBlank()) return;
                if (roomTypeName == null || roomTypeName.isBlank()) {
                    throw new BusinessLogicException(
                            "This coupon is only valid for specific room types.",
                            "COUPON_WRONG_ROOM_TYPE");
                }
                List<String> allowedTypes = Arrays.asList(promo.getRoomType().split(","));
                boolean matches = allowedTypes.stream()
                        .anyMatch(t -> t.trim().equalsIgnoreCase(roomTypeName.trim()));
                if (!matches) {
                    throw new BusinessLogicException(
                            "This coupon is only valid for: " + promo.getRoomType() + " room types.",
                            "COUPON_WRONG_ROOM_TYPE");
                }
                break;

            default:
                // Unknown scope — allow (forward-compatible)
                break;
        }
    }

    /** Non-throwing scope check for getAvailableCoupons() filtering. */
    private boolean isScopeMatch(Promotion promo, UUID hotelId, String city, String roomTypeName) {
        String scope = promo.getScope();
        if (scope == null || "UNIVERSAL".equalsIgnoreCase(scope)) return true;

        switch (scope.toUpperCase()) {
            case "HOTEL":
                return promo.getHotelId() == null
                        || (hotelId != null && promo.getHotelId().equals(hotelId));
            case "CITY":
                return promo.getCity() == null || promo.getCity().isBlank()
                        || (city != null && promo.getCity().trim().equalsIgnoreCase(city.trim()));
            case "ROOM_TYPE":
                if (promo.getRoomType() == null || promo.getRoomType().isBlank()) return true;
                if (roomTypeName == null || roomTypeName.isBlank()) return false;
                return Arrays.stream(promo.getRoomType().split(","))
                        .anyMatch(t -> t.trim().equalsIgnoreCase(roomTypeName.trim()));
            default:
                return true;
        }
    }

    private boolean isMinAmountMet(Promotion promo, BigDecimal amount) {
        return promo.getMinBookingAmount() == null
                || amount.compareTo(promo.getMinBookingAmount()) >= 0;
    }

    private boolean isPerUserLimitOk(Promotion promo, String userId) {
        if (promo.getPerUserLimit() == null || promo.getPerUserLimit() <= 0) return true;
        try {
            long used = couponUserUsageRepository.countByPromotionIdAndUserId(
                    promo.getId(), UUID.fromString(userId));
            return used < promo.getPerUserLimit();
        } catch (Exception e) {
            return true; // if userId is invalid, don't block
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Assertion helpers (throw on failure)
    // ─────────────────────────────────────────────────────────────────────────

    private void assertActive(Promotion promo) {
        if (!Boolean.TRUE.equals(promo.getIsActive())) {
            throw new BusinessLogicException("This coupon is no longer active.", "COUPON_INACTIVE");
        }
    }

    private void assertNotExpired(Promotion promo) {
        LocalDateTime now = LocalDateTime.now();
        if (promo.getValidFrom() != null && now.isBefore(promo.getValidFrom())) {
            throw new BusinessLogicException("This coupon is not yet valid.", "COUPON_NOT_STARTED");
        }
        if (promo.getValidUntil() != null && now.isAfter(promo.getValidUntil())) {
            throw new BusinessLogicException("This coupon has expired.", "COUPON_EXPIRED");
        }
    }

    private void assertMinAmount(Promotion promo, BigDecimal amount) {
        if (promo.getMinBookingAmount() != null
                && amount.compareTo(promo.getMinBookingAmount()) < 0) {
            throw new BusinessLogicException(
                    "Minimum booking amount of ₹" + promo.getMinBookingAmount().toPlainString() + " required.",
                    "COUPON_MIN_AMOUNT");
        }
    }

    private void assertTotalUsageLimit(Promotion promo) {
        if (promo.getTotalUsageLimit() != null
                && promo.getCurrentUsage() >= promo.getTotalUsageLimit()) {
            throw new BusinessLogicException("This coupon has reached its usage limit.", "COUPON_LIMIT_REACHED");
        }
    }

    private void assertPerUserLimit(Promotion promo, String userId) {
        if (promo.getPerUserLimit() != null && promo.getPerUserLimit() > 0) {
            long used = couponUserUsageRepository.countByPromotionIdAndUserId(
                    promo.getId(), UUID.fromString(userId));
            if (used >= promo.getPerUserLimit()) {
                throw new BusinessLogicException(
                        "You have already used this coupon the maximum number of times.",
                        "COUPON_PER_USER_LIMIT");
            }
        }
    }

    private void assertPaymentMethod(Promotion promo, String paymentMethod) {
        String methods = promo.getApplicablePaymentMethods();
        if (methods == null || methods.isBlank() || "all".equalsIgnoreCase(methods)) return;
        List<String> allowed = Arrays.asList(methods.split(","));
        if (allowed.stream().noneMatch(m -> m.trim().equalsIgnoreCase(paymentMethod))) {
            throw new BusinessLogicException(
                    "This coupon is only valid for: " + methods + " payments.",
                    "COUPON_WRONG_METHOD");
        }
    }

    private void assertBank(Promotion promo, String selectedBank) {
        String banks = promo.getApplicableBanks();
        if (banks == null || banks.isBlank()) return;
        if (selectedBank == null || selectedBank.isBlank()) {
            throw new BusinessLogicException(
                    "Please select a bank to use this coupon.",
                    "COUPON_BANK_REQUIRED");
        }
        List<String> allowed = Arrays.asList(banks.split(","));
        if (allowed.stream().noneMatch(b -> b.trim().equalsIgnoreCase(selectedBank))) {
            throw new BusinessLogicException(
                    "This coupon is only valid with: " + banks + " bank.",
                    "COUPON_WRONG_BANK");
        }
    }

    private void assertWallet(Promotion promo, String selectedWallet) {
        String wallets = promo.getApplicableWallets();
        if (wallets == null || wallets.isBlank()) return;
        if (selectedWallet == null || selectedWallet.isBlank()) {
            throw new BusinessLogicException(
                    "Please select a wallet to use this coupon.",
                    "COUPON_WALLET_REQUIRED");
        }
        List<String> allowed = Arrays.asList(wallets.split(","));
        if (allowed.stream().noneMatch(w -> w.trim().equalsIgnoreCase(selectedWallet))) {
            throw new BusinessLogicException(
                    "This coupon is only valid with: " + wallets + " wallet.",
                    "COUPON_WRONG_WALLET");
        }
    }

    private void assertUpiApp(Promotion promo, String selectedUpiApp) {
        String apps = promo.getApplicableUpiApps();
        if (apps == null || apps.isBlank()) return;
        if (selectedUpiApp == null || selectedUpiApp.isBlank()) {
            throw new BusinessLogicException(
                    "Please select a UPI app to use this coupon.",
                    "COUPON_UPI_APP_REQUIRED");
        }
        List<String> allowed = Arrays.asList(apps.split(","));
        if (allowed.stream().noneMatch(a -> a.trim().equalsIgnoreCase(selectedUpiApp))) {
            throw new BusinessLogicException(
                    "This coupon is only valid with: " + apps + " UPI app.",
                    "COUPON_WRONG_UPI_APP");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Computation helpers
    // ─────────────────────────────────────────────────────────────────────────

    private BigDecimal computeDiscount(Promotion promo, BigDecimal amount) {
        if ("FLAT".equalsIgnoreCase(promo.getDiscountType())) {
            BigDecimal flat = promo.getDiscountValue().setScale(2, RoundingMode.HALF_UP);
            return flat.min(amount);
        }
        // PERCENT
        BigDecimal pct = amount.multiply(promo.getDiscountValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (promo.getMaxDiscountAmount() != null) {
            pct = pct.min(promo.getMaxDiscountAmount());
        }
        return pct;
    }

    private String buildLabel(Promotion promo) {
        if ("FLAT".equalsIgnoreCase(promo.getDiscountType())) {
            return "₹" + promo.getDiscountValue().toBigInteger() + " OFF";
        }
        String label = promo.getDiscountValue().toBigInteger() + "% OFF";
        if (promo.getMaxDiscountAmount() != null) {
            label += " (up to ₹" + promo.getMaxDiscountAmount().toBigInteger() + ")";
        }
        return label;
    }

    private CouponValidateResponse buildResponse(Promotion promo, String code,
                                                  BigDecimal discountAmount,
                                                  BigDecimal originalAmount,
                                                  BigDecimal finalAmount) {
        return CouponValidateResponse.builder()
                .code(code)
                .label(buildLabel(promo))
                .description(promo.getPromotionName())
                .discountType(promo.getDiscountType())
                .discountValue(promo.getDiscountValue())
                .discountAmount(discountAmount)
                .originalAmount(originalAmount)
                .finalAmount(finalAmount)
                .scope(promo.getScope() != null ? promo.getScope() : "UNIVERSAL")
                .isStackable(Boolean.TRUE.equals(promo.getIsStackable()))
                .applicablePaymentMethods(promo.getApplicablePaymentMethods())
                .minBookingAmount(promo.getMinBookingAmount())
                .maxDiscountAmount(promo.getMaxDiscountAmount())
                .build();
    }
}
