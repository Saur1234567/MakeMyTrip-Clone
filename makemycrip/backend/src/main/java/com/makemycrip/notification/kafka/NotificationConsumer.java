package com.makemycrip.notification.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemycrip.notification.entity.Notification;
import com.makemycrip.notification.repository.NotificationRepository;
import com.makemycrip.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "booking.events", groupId = "notification-group",
            autoStartup = "${app.kafka.enabled:true}")
    public void handleBookingEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String eventType = event.path("type").asText();
            String userId = event.path("userId").asText();
            String bookingRef = event.path("bookingRef").asText();

            switch (eventType) {
                case "BOOKING_CONFIRMED" -> {
                    saveInAppNotification(userId, "Booking Confirmed!",
                            "Your booking " + bookingRef + " has been confirmed.");
                    String email = event.path("email").asText();
                    if (!email.isBlank()) {
                        emailService.sendBookingConfirmation(email, event);
                    }
                }
                case "BOOKING_CANCELLED" -> {
                    saveInAppNotification(userId, "Booking Cancelled",
                            "Your booking " + bookingRef + " has been cancelled.");
                }
                case "CHECK_IN_REMINDER" -> {
                    saveInAppNotification(userId, "Check-in Tomorrow!",
                            "Your check-in for booking " + bookingRef + " is tomorrow.");
                }
                case "REVIEW_REQUEST" -> {
                    saveInAppNotification(userId, "How was your stay?",
                            "Please leave a review for your recent stay (booking " + bookingRef + ").");
                }
                default -> log.debug("Unhandled booking event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing booking event: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "notification.email", groupId = "notification-group",
            autoStartup = "${app.kafka.enabled:true}")
    public void handleEmailNotification(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            String type = payload.path("type").asText();
            String to = payload.path("to").asText();
            log.info("Processing email notification: type={} to={}", type, to);
            emailService.sendTemplatedEmail(type, to, payload);
        } catch (Exception e) {
            log.error("Error processing email notification: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "user.events", groupId = "notification-group",
            autoStartup = "${app.kafka.enabled:true}")
    public void handleUserEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String eventType = event.path("type").asText();
            String userId = event.path("userId").asText();

            switch (eventType) {
                case "LOYALTY_TIER_UPGRADE" -> {
                    String newTier = event.path("newTier").asText();
                    saveInAppNotification(userId, "Congratulations! Tier Upgrade",
                            "You have been upgraded to " + newTier + " tier!");
                }
                case "NEW_DEVICE_LOGIN" -> {
                    saveInAppNotification(userId, "New Device Login",
                            "A new login was detected from a new device.");
                }
                default -> log.debug("Unhandled user event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing user event: {}", e.getMessage(), e);
        }
    }

    private void saveInAppNotification(String userId, String title, String message) {
        if (userId == null || userId.isBlank()) return;
        try {
            Notification notification = Notification.builder()
                    .userId(UUID.fromString(userId))
                    .title(title)
                    .message(message)
                    .build();
            notificationRepository.save(notification);
        } catch (Exception e) {
            log.error("Failed to save in-app notification for userId={}: {}", userId, e.getMessage());
        }
    }
}
