package com.makemycrip.booking.service;

import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.enums.BookingStatus;
import com.makemycrip.booking.enums.CancelledBy;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import com.makemycrip.notification.entity.BookingReminderLog;
import com.makemycrip.notification.repository.BookingReminderLogRepository;
import com.makemycrip.notification.service.NotificationDispatcher;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingSchedulerService {

    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final BookingReminderLogRepository reminderLogRepository;

    // Run at 6 AM daily: mark no-shows
    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    public void markNoShows() {
        LocalDate today = LocalDate.now();
        List<Booking> bookings = bookingRepository.findConfirmedForCheckIn(today);
        int count = 0;
        for (Booking booking : bookings) {
            if (booking.getCheckedInAt() == null) {
                booking.setStatus(BookingStatus.NO_SHOW);
                booking.setNoShowAt(LocalDateTime.now());
                bookingRepository.save(booking);
                count++;
                log.info("Marked no-show: bookingRef={}", booking.getBookingReference());
            }
        }
        log.info("No-show job complete: marked {} bookings", count);
    }

    // Check-in reminder: 24h before
    @Scheduled(cron = "0 0 10 * * *")
    public void sendCheckInReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Booking> bookings = bookingRepository.findCheckInsForTomorrow(tomorrow);
        for (Booking booking : bookings) {
            User user = userRepository.findById(booking.getUserId()).orElse(null);
            Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
            if (user != null && hotel != null) {
                notificationDispatcher.sendCheckInReminder(
                        user.getEmail(), user.getFirstName(),
                        booking.getBookingReference(), hotel.getName(),
                        booking.getCheckIn().toString());
            }
        }
        log.info("Check-in reminders sent: {} bookings", bookings.size());
    }

    // Post-checkout review requests: 2 hours after checkout
    @Scheduled(cron = "0 */30 * * * *")
    public void sendReviewRequests() {
        LocalDateTime twoHoursAgo = LocalDateTime.now().minusHours(2);
        List<Booking> recentCheckouts = bookingRepository.findRecentCheckOuts(twoHoursAgo.minusMinutes(30));
        for (Booking booking : recentCheckouts) {
            if (booking.getCheckedOutAt() != null &&
                booking.getCheckedOutAt().isBefore(twoHoursAgo) &&
                booking.getCheckedOutAt().isAfter(twoHoursAgo.minusMinutes(30))) {
                User user = userRepository.findById(booking.getUserId()).orElse(null);
                Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
                if (user != null && hotel != null) {
                    notificationDispatcher.sendReviewRequest(
                            user.getEmail(), user.getFirstName(),
                            booking.getBookingReference(), hotel.getId(), hotel.getName());
                }
            }
        }
    }

    // Abandoned booking reminders — runs every 5 minutes
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void processAbandonedBookings() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyMinAgo = now.minusMinutes(30);
        LocalDateTime threeHoursAgo = now.minusHours(3);
        LocalDateTime twentyFourHoursAgo = now.minusHours(24);

        // Reminder 1: 30 min after booking, only if not yet sent and booking < 3h old
        List<Booking> abandoned30 = bookingRepository.findAbandonedBookings(thirtyMinAgo);
        for (Booking b : abandoned30) {
            if (b.getBookedAt().isAfter(threeHoursAgo)
                    && !reminderLogRepository.existsByBookingIdAndReminderNumber(b.getId(), 1)) {
                sendAbandonedReminder(b, 1, null);
            }
        }

        // Reminder 2: 3h after booking with coupon, only if not yet sent and booking < 24h old
        List<Booking> abandoned3h = bookingRepository.findAbandonedBookings(threeHoursAgo);
        for (Booking b : abandoned3h) {
            if (b.getBookedAt().isAfter(twentyFourHoursAgo)
                    && !reminderLogRepository.existsByBookingIdAndReminderNumber(b.getId(), 2)) {
                sendAbandonedReminder(b, 2, "COMEBACK5");
            }
        }

        // Reminder 3: 24h last chance, only if not yet sent
        List<Booking> abandoned24h = bookingRepository.findAbandonedBookings(twentyFourHoursAgo);
        for (Booking b : abandoned24h) {
            if (!reminderLogRepository.existsByBookingIdAndReminderNumber(b.getId(), 3)) {
                sendAbandonedReminder(b, 3, null);
            }
        }
    }

    private void sendAbandonedReminder(Booking booking, int reminderNum, String coupon) {
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        if (user == null) return;

        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        RoomType roomType = booking.getRoomTypeId() != null
                ? roomTypeRepository.findById(booking.getRoomTypeId()).orElse(null)
                : null;

        String hotelName = hotel != null ? hotel.getName() : null;
        String roomTypeName = roomType != null ? roomType.getName() : null;
        String checkIn = booking.getCheckIn() != null ? booking.getCheckIn().toString() : null;
        String checkOut = booking.getCheckOut() != null ? booking.getCheckOut().toString() : null;
        String totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount().toPlainString() : null;

        notificationDispatcher.sendAbandonedBookingEmail(
                user.getEmail(), user.getFirstName(),
                booking.getBookingReference(), reminderNum, coupon,
                booking.getUserId(), hotelName, checkIn, checkOut, totalAmount);

        // Record that this reminder was sent to avoid duplicates
        try {
            reminderLogRepository.save(BookingReminderLog.builder()
                    .bookingId(booking.getId())
                    .reminderNumber(reminderNum)
                    .build());
        } catch (Exception e) {
            log.warn("Could not save reminder log for booking={} reminder={}: {}",
                    booking.getId(), reminderNum, e.getMessage());
        }

        log.info("Abandoned booking reminder #{} sent: bookingRef={}", reminderNum, booking.getBookingReference());
    }
}
