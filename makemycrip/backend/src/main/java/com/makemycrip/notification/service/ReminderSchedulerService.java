package com.makemycrip.notification.service;

import com.makemycrip.notification.entity.EmailVerificationReminder;
import com.makemycrip.notification.repository.EmailVerificationReminderRepository;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderSchedulerService {

    private final EmailVerificationReminderRepository reminderRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;

    /**
     * Called when a new user registers — schedules the first verification reminder for 24h later.
     */
    @Transactional
    public void scheduleEmailVerificationReminders(UUID userId) {
        // Only create if not already scheduled
        reminderRepository.findByUserIdAndCompletedFalse(userId).ifPresentOrElse(
                existing -> log.debug("Email verification reminder already scheduled for userId={}", userId),
                () -> {
                    EmailVerificationReminder reminder = EmailVerificationReminder.builder()
                            .userId(userId)
                            .reminderCount(0)
                            .nextSendAt(LocalDateTime.now().plusHours(24))
                            .completed(false)
                            .build();
                    reminderRepository.save(reminder);
                    log.debug("Scheduled email verification reminder for userId={}", userId);
                }
        );
    }

    /**
     * Called when a user verifies their email — cancels all pending reminders.
     */
    @Transactional
    public void cancelEmailVerificationReminders(UUID userId) {
        reminderRepository.findByUserIdAndCompletedFalse(userId).ifPresent(reminder -> {
            reminder.setCompleted(true);
            reminderRepository.save(reminder);
            log.debug("Cancelled email verification reminders for userId={}", userId);
        });
    }

    /**
     * Runs every hour — sends due email verification reminders.
     * Schedule: 24h → 48h → 72h (then stop)
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void processEmailVerificationReminders() {
        List<EmailVerificationReminder> due = reminderRepository
                .findByCompletedFalseAndNextSendAtBefore(LocalDateTime.now());

        for (EmailVerificationReminder reminder : due) {
            User user = userRepository.findById(reminder.getUserId()).orElse(null);
            if (user == null) {
                reminder.setCompleted(true);
                reminderRepository.save(reminder);
                continue;
            }

            // If user already verified, mark completed
            if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
                reminder.setCompleted(true);
                reminderRepository.save(reminder);
                continue;
            }

            int nextCount = reminder.getReminderCount() + 1;
            reminder.setReminderCount(nextCount);
            reminder.setLastSentAt(LocalDateTime.now());

            if (nextCount >= 3) {
                // Final reminder — after this, stop
                reminder.setCompleted(true);
                reminder.setNextSendAt(null);
            } else {
                // Schedule next: 24h intervals
                reminder.setNextSendAt(LocalDateTime.now().plusHours(24));
            }
            reminderRepository.save(reminder);

            notificationDispatcher.sendEmailVerificationReminder(
                    user.getEmail(), user.getFirstName(), nextCount);

            log.info("Email verification reminder #{} sent to userId={}", nextCount, user.getId());
        }
    }
}
