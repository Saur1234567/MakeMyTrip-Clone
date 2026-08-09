package com.makemycrip.notification.repository;

import com.makemycrip.notification.entity.EmailVerificationReminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationReminderRepository extends JpaRepository<EmailVerificationReminder, UUID> {
    Optional<EmailVerificationReminder> findByUserIdAndCompletedFalse(UUID userId);
    List<EmailVerificationReminder> findByCompletedFalseAndNextSendAtBefore(LocalDateTime now);
}
