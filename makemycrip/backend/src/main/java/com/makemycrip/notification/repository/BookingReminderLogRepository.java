package com.makemycrip.notification.repository;

import com.makemycrip.notification.entity.BookingReminderLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingReminderLogRepository extends JpaRepository<BookingReminderLog, UUID> {
    Optional<BookingReminderLog> findByBookingIdAndReminderNumber(UUID bookingId, int reminderNumber);
    boolean existsByBookingIdAndReminderNumber(UUID bookingId, int reminderNumber);
}
