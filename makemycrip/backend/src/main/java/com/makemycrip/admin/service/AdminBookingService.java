package com.makemycrip.admin.service;

import com.makemycrip.booking.dto.BookingResponse;
import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.entity.BookingGuest;
import com.makemycrip.booking.entity.BookingModificationLog;
import com.makemycrip.booking.enums.BookingStatus;
import com.makemycrip.booking.enums.ModificationType;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.common.audit.AuditService;
import com.makemycrip.common.exception.BusinessLogicException;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.HotelImage;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import com.makemycrip.notification.service.NotificationDispatcher;
import com.makemycrip.payment.service.PaymentService;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminBookingService {

    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final NotificationDispatcher notificationDispatcher;
    private final AuditService auditService;

    public Page<BookingResponse> listBookings(int page, int size, String status, UUID hotelId, String search) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("bookedAt").descending());
        Page<Booking> bookings = hotelId != null
                ? bookingRepository.findByHotelIdOrderByBookedAtDesc(hotelId, pageable)
                : bookingRepository.findAll(pageable);

        return bookings.map(b -> {
            Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
            RoomType rt = roomTypeRepository.findById(b.getRoomTypeId()).orElse(null);
            return mapToResponse(b, hotel, rt);
        });
    }

    @Transactional
    public BookingResponse checkIn(UUID bookingId, UUID roomId, UUID adminId) {
        Booking booking = getBooking(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessLogicException("Booking must be CONFIRMED to check in", "INVALID_STATE");
        }
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        booking.setCheckedInBy(adminId);
        if (roomId != null) booking.setRoomId(roomId);
        bookingRepository.save(booking);
        logModification(booking, adminId, ModificationType.STATUS_CHANGED, "CONFIRMED", "CHECKED_IN", "Check-in");
        log.info("Checked in: bookingId={} by adminId={}", bookingId, adminId);
        return mapBookingResponse(booking);
    }

    @Transactional
    public BookingResponse checkOut(UUID bookingId, UUID adminId) {
        Booking booking = getBooking(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new BusinessLogicException("Booking must be CHECKED_IN to check out", "INVALID_STATE");
        }
        booking.setStatus(BookingStatus.CHECKED_OUT);
        booking.setCheckedOutAt(LocalDateTime.now());
        bookingRepository.save(booking);
        logModification(booking, adminId, ModificationType.STATUS_CHANGED, "CHECKED_IN", "CHECKED_OUT", "Check-out");
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        if (user != null && hotel != null) {
            notificationDispatcher.sendReviewRequest(user.getEmail(), user.getFirstName(),
                    booking.getBookingReference(), hotel.getId(), hotel.getName());
        }
        log.info("Checked out: bookingId={} by adminId={}", bookingId, adminId);
        return mapBookingResponse(booking);
    }

    @Transactional
    public BookingResponse upgradeRoom(UUID bookingId, UUID newRoomTypeId, UUID adminId) {
        Booking booking = getBooking(bookingId);
        RoomType newRoomType = roomTypeRepository.findById(newRoomTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        UUID oldRoomTypeId = booking.getRoomTypeId();
        booking.setRoomTypeId(newRoomTypeId);
        bookingRepository.save(booking);
        logModification(booking, adminId, ModificationType.ROOM_UPGRADED,
                oldRoomTypeId.toString(), newRoomTypeId.toString(), "Admin complimentary upgrade");
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        RoomType oldRoomType = roomTypeRepository.findById(oldRoomTypeId).orElse(null);
        if (user != null && hotel != null && oldRoomType != null) {
            notificationDispatcher.sendRoomUpgradeEmail(user.getEmail(), user.getFirstName(),
                    booking.getBookingReference(), oldRoomType.getName(), newRoomType.getName(), hotel.getName());
        }
        return mapBookingResponse(booking);
    }

    @Transactional
    public void addNote(UUID bookingId, String note, UUID adminId) {
        Booking booking = getBooking(bookingId);
        booking.setInternalNotes(note);
        bookingRepository.save(booking);
        logModification(booking, adminId, ModificationType.NOTES_UPDATED, null, note, "Admin note added");
    }

    @Transactional
    public void issueManualRefund(UUID bookingId, BigDecimal amount, String reason, String adminId) {
        paymentService.processRefund(bookingId, amount, reason, adminId);
        auditService.log(UUID.fromString(adminId), "MANUAL_REFUND", "Booking", bookingId,
                null, java.util.Map.of("amount", amount, "reason", reason), null, reason);
    }

    public byte[] exportCsv(String status, UUID hotelId, String search) {
        PageRequest pageable = PageRequest.of(0, Integer.MAX_VALUE, Sort.by("bookedAt").descending());
        Page<Booking> bookings = hotelId != null
                ? bookingRepository.findByHotelIdOrderByBookedAtDesc(hotelId, pageable)
                : bookingRepository.findAll(pageable);

        StringBuilder sb = new StringBuilder();
        sb.append("Booking Ref,Hotel,Guest Name,Guest Email,Check-In,Check-Out,Nights,Adults,Total Amount,Status,Booked At\n");
        bookings.getContent().forEach(b -> {
            Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
            List<BookingGuest> guests = b.getGuests();
            BookingGuest pg = guests != null ? guests.stream()
                    .filter(g -> Boolean.TRUE.equals(g.getIsPrimary()))
                    .findFirst().orElse(guests.isEmpty() ? null : guests.get(0)) : null;
            String guestName = pg != null
                    ? ((pg.getFirstName() != null ? pg.getFirstName() : "") + " "
                       + (pg.getLastName() != null ? pg.getLastName() : "")).trim() : "";
            String guestEmail = pg != null && pg.getEmail() != null ? pg.getEmail() : "";
            sb.append(String.format("%s,%s,%s,%s,%s,%s,%d,%d,%s,%s,%s\n",
                    b.getBookingReference(),
                    hotel != null ? hotel.getName().replace(",", " ") : "",
                    guestName.replace(",", " "),
                    guestEmail,
                    b.getCheckIn(),
                    b.getCheckOut(),
                    b.getTotalNights() != null ? b.getTotalNights() : 0,
                    b.getAdults() != null ? b.getAdults() : 0,
                    b.getTotalAmount(),
                    b.getStatus().name(),
                    b.getBookedAt() != null ? b.getBookedAt().toString() : ""
            ));
        });
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private void logModification(Booking booking, UUID adminId, ModificationType type,
                                  Object oldVal, Object newVal, String reason) {
        BookingModificationLog log = BookingModificationLog.builder()
                .booking(booking)
                .modifiedBy(adminId)
                .modifiedByRole("ADMIN")
                .modificationType(type)
                .reason(reason)
                .build();
        booking.getModificationLogs().add(log);
    }

    private Booking getBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
    }

    private BookingResponse mapToResponse(Booking b, Hotel hotel, RoomType rt) {
        // Primary guest details
        List<BookingGuest> guests = b.getGuests();
        BookingGuest primaryGuest = guests != null ? guests.stream()
                .filter(g -> Boolean.TRUE.equals(g.getIsPrimary()))
                .findFirst()
                .orElse(guests.isEmpty() ? null : guests.get(0)) : null;

        String primaryGuestName = primaryGuest != null
                ? ((primaryGuest.getFirstName() != null ? primaryGuest.getFirstName() : "") + " "
                   + (primaryGuest.getLastName() != null ? primaryGuest.getLastName() : "")).trim()
                : null;

        // Hotel primary image
        String hotelImageUrl = null;
        if (hotel != null && hotel.getImages() != null && !hotel.getImages().isEmpty()) {
            hotelImageUrl = hotel.getImages().stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsPrimary()))
                    .findFirst()
                    .map(HotelImage::getImageUrl)
                    .orElse(hotel.getImages().get(0).getImageUrl());
        }

        return BookingResponse.builder()
                .id(b.getId())
                .bookingReference(b.getBookingReference())
                .status(b.getStatus().name())
                .hotelName(hotel != null ? hotel.getName() : null)
                .hotelCity(hotel != null ? hotel.getCity() : null)
                .hotelAddress(hotel != null ? hotel.getAddressLine1() : null)
                .hotelImageUrl(hotelImageUrl)
                .roomTypeName(rt != null ? rt.getName() : null)
                .checkIn(b.getCheckIn())
                .checkOut(b.getCheckOut())
                .totalNights(b.getTotalNights())
                .adults(b.getAdults())
                .totalAmount(b.getTotalAmount())
                .currency(b.getCurrency())
                .bookedAt(b.getBookedAt())
                .confirmedAt(b.getConfirmedAt())
                .primaryGuestName(primaryGuestName)
                .guestEmail(primaryGuest != null ? primaryGuest.getEmail() : null)
                .guestPhone(primaryGuest != null ? primaryGuest.getPhone() : null)
                .build();
    }

    private BookingResponse mapBookingResponse(Booking b) {
        Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
        RoomType rt = roomTypeRepository.findById(b.getRoomTypeId()).orElse(null);
        return mapToResponse(b, hotel, rt);
    }

}
