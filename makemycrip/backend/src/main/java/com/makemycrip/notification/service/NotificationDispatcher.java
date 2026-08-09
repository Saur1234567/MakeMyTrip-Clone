package com.makemycrip.notification.service;

import com.makemycrip.auth.enums.OtpPurpose;
import com.makemycrip.notification.dto.CreateNotificationRequest;
import com.makemycrip.notification.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDispatcher {

    private final EmailService emailService;
    private final NotificationService notificationService;

    // ─── OTP Emails ───────────────────────────────────────────────────────────

    @Async
    public void sendOtpEmail(String email, String name, String otp, OtpPurpose purpose) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("otp", otp);
            vars.put("purpose", purpose.name());
            vars.put("expiryMinutes", 10);
            String template = purpose == OtpPurpose.EMAIL_VERIFY ? "email-otp-verify" : "email-otp-reset";
            String subject = purpose == OtpPurpose.EMAIL_VERIFY
                    ? "Verify your MakeMyCrip account"
                    : "Reset your MakeMyCrip password";
            emailService.send(email, subject, template, vars);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", email, e);
        }
    }

    // ─── Welcome ──────────────────────────────────────────────────────────────

    @Async
    public void sendWelcomeEmail(String email, String name) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            emailService.send(email, "Welcome to MakeMyCrip!", "welcome", vars);
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}", email, e);
        }
    }

    // ─── Password Changed ─────────────────────────────────────────────────────

    @Async
    public void sendPasswordChangedEmail(String email, String name) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            emailService.send(email, "Your MakeMyCrip password was changed", "security-alert", vars);
        } catch (Exception e) {
            log.error("Failed to send password changed email to {}", email, e);
        }
    }

    // ─── New Device Login ─────────────────────────────────────────────────────

    @Async
    public void sendNewDeviceLoginAlert(String email, String name, String deviceName, String ip, String city) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("deviceName", deviceName);
            vars.put("ip", ip);
            vars.put("city", city);
            emailService.send(email, "New sign-in to your MakeMyCrip account", "new-device-login", vars);
        } catch (Exception e) {
            log.error("Failed to send new device login email to {}", email, e);
        }
    }

    // ─── Booking Confirmation ─────────────────────────────────────────────────

    @Async
    public void sendBookingConfirmation(String email, String name, String bookingRef,
                                        Object bookingData, UUID userId) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("bookingRef", bookingRef);
            vars.put("data", bookingData);
            emailService.send(email, "Booking Confirmed – " + bookingRef, "booking-confirmation", vars);

            if (userId != null) {
                notificationService.create(CreateNotificationRequest.builder()
                        .userId(userId)
                        .type(NotificationType.BOOKING)
                        .title("Booking Confirmed!")
                        .message("Your booking " + bookingRef + " has been confirmed.")
                        .actionUrl("/booking/confirmation?bookingRef=" + bookingRef)
                        .category("BOOKING")
                        .referenceType("BOOKING")
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to send booking confirmation for {}", bookingRef, e);
        }
    }

    // ─── Booking Cancellation ─────────────────────────────────────────────────

    @Async
    public void sendCancellationEmail(String email, String name, String bookingRef,
                                      Object refundInfo, UUID userId) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("bookingRef", bookingRef);
            vars.put("refundInfo", refundInfo);
            emailService.send(email, "Booking Cancelled – " + bookingRef, "booking-cancellation", vars);

            if (userId != null) {
                notificationService.create(CreateNotificationRequest.builder()
                        .userId(userId)
                        .type(NotificationType.BOOKING)
                        .title("Booking Cancelled")
                        .message("Your booking " + bookingRef + " has been cancelled.")
                        .actionUrl("/user/bookings/" + bookingRef)
                        .category("BOOKING")
                        .referenceType("BOOKING")
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to send cancellation email for {}", bookingRef, e);
        }
    }

    // ─── Check-in Reminder ────────────────────────────────────────────────────

    @Async
    public void sendCheckInReminder(String email, String name, String bookingRef,
                                    String hotelName, String checkInDate) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("bookingRef", bookingRef);
            vars.put("hotelName", hotelName);
            vars.put("checkInDate", checkInDate);
            emailService.send(email, "Check-in Tomorrow at " + hotelName, "check-in-reminder", vars);
        } catch (Exception e) {
            log.error("Failed to send check-in reminder for {}", bookingRef, e);
        }
    }

    // ─── Review Request ───────────────────────────────────────────────────────

    @Async
    public void sendReviewRequest(String email, String name, String bookingRef,
                                  UUID hotelId, String hotelName) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("bookingRef", bookingRef);
            vars.put("hotelId", hotelId.toString());
            vars.put("hotelName", hotelName);
            emailService.send(email, "How was your stay at " + hotelName + "?", "review-request", vars);
        } catch (Exception e) {
            log.error("Failed to send review request for {}", bookingRef, e);
        }
    }

    // ─── Abandoned Booking ────────────────────────────────────────────────────

    @Async
    public void sendAbandonedBookingEmail(String email, String name, String bookingRef,
                                          int reminderNumber, String couponCode,
                                          UUID userId, String hotelName,
                                          String checkIn, String checkOut,
                                          String totalAmount) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("bookingRef", bookingRef);
            vars.put("couponCode", couponCode);
            vars.put("hotelName", hotelName != null ? hotelName : "your selected hotel");
            vars.put("checkIn", checkIn != null ? checkIn : "");
            vars.put("checkOut", checkOut != null ? checkOut : "");
            vars.put("totalAmount", totalAmount != null ? totalAmount : "");
            vars.put("reminderNumber", reminderNumber);
            vars.put("paymentUrl", "/booking/payment?bookingRef=" + bookingRef);
            emailService.send(email, "Complete your booking at " + vars.get("hotelName"),
                    "abandoned-booking", vars);

            if (userId != null) {
                notificationService.create(CreateNotificationRequest.builder()
                        .userId(userId)
                        .type(NotificationType.REMINDER)
                        .title("Complete Your Booking")
                        .message("Don't miss out! Complete your booking at " + vars.get("hotelName") + ".")
                        .actionUrl("/booking/payment?bookingRef=" + bookingRef)
                        .category("REMINDER")
                        .referenceType("BOOKING")
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to send abandoned booking email for {}", bookingRef, e);
        }
    }

    // ─── Payment Success ──────────────────────────────────────────────────────

    @Async
    public void sendPaymentSuccessNotification(UUID userId, String bookingRef, String amount) {
        try {
            notificationService.create(CreateNotificationRequest.builder()
                    .userId(userId)
                    .type(NotificationType.PAYMENT)
                    .title("Payment Successful")
                    .message("Payment of ₹" + amount + " received for booking " + bookingRef + ".")
                    .actionUrl("/booking/confirmation?bookingRef=" + bookingRef)
                    .category("PAYMENT")
                    .referenceType("BOOKING")
                    .build());
        } catch (Exception e) {
            log.error("Failed to create payment success notification for {}", bookingRef, e);
        }
    }

    // ─── Payment Failed ───────────────────────────────────────────────────────

    @Async
    public void sendPaymentFailedNotification(UUID userId, String bookingRef) {
        try {
            notificationService.create(CreateNotificationRequest.builder()
                    .userId(userId)
                    .type(NotificationType.PAYMENT)
                    .title("Payment Failed")
                    .message("Your payment for booking " + bookingRef + " could not be processed.")
                    .actionUrl("/booking/payment?bookingRef=" + bookingRef)
                    .category("PAYMENT")
                    .referenceType("BOOKING")
                    .build());
        } catch (Exception e) {
            log.error("Failed to create payment failed notification for {}", bookingRef, e);
        }
    }

    // ─── Refund ───────────────────────────────────────────────────────────────

    @Async
    public void sendRefundNotification(UUID userId, String bookingRef, String amount) {
        try {
            notificationService.create(CreateNotificationRequest.builder()
                    .userId(userId)
                    .type(NotificationType.PAYMENT)
                    .title("Refund Initiated")
                    .message("Refund of ₹" + amount + " for booking " + bookingRef + " has been initiated.")
                    .actionUrl("/user/bookings/" + bookingRef)
                    .category("PAYMENT")
                    .referenceType("BOOKING")
                    .build());
        } catch (Exception e) {
            log.error("Failed to create refund notification for {}", bookingRef, e);
        }
    }

    // ─── Room Upgrade ─────────────────────────────────────────────────────────

    @Async
    public void sendRoomUpgradeEmail(String email, String name, String bookingRef,
                                     String oldRoom, String newRoom, String hotelName) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("bookingRef", bookingRef);
            vars.put("oldRoom", oldRoom);
            vars.put("newRoom", newRoom);
            vars.put("hotelName", hotelName);
            emailService.send(email, "Complimentary Room Upgrade at " + hotelName, "room-upgrade", vars);
        } catch (Exception e) {
            log.error("Failed to send room upgrade email to {}", email, e);
        }
    }

    // ─── Loyalty ──────────────────────────────────────────────────────────────

    @Async
    public void sendLoyaltyPointsEmail(String email, String name, int pointsEarned,
                                       int totalPoints, String newTier) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("pointsEarned", pointsEarned);
            vars.put("totalPoints", totalPoints);
            vars.put("newTier", newTier);
            emailService.send(email, "You earned " + pointsEarned + " loyalty points!", "loyalty-tier-upgrade", vars);
        } catch (Exception e) {
            log.error("Failed to send loyalty email to {}", email, e);
        }
    }

    // ─── Waitlist ─────────────────────────────────────────────────────────────

    @Async
    public void sendWaitlistNotification(String email, String name, String bookingRef,
                                         String hotelName, int hoursToConfirm) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("hotelName", hotelName);
            vars.put("bookingRef", bookingRef);
            vars.put("hoursToConfirm", hoursToConfirm);
            emailService.send(email, "Room available! Confirm your booking at " + hotelName,
                    "waitlist-available", vars);
        } catch (Exception e) {
            log.error("Failed to send waitlist email to {}", email, e);
        }
    }

    // ─── Email Verification Reminder ──────────────────────────────────────────

    @Async
    public void sendEmailVerificationReminder(String email, String name, int reminderNumber) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("reminderNumber", reminderNumber);
            String subject = reminderNumber >= 3
                    ? "⚠️ Final reminder: Verify your MakeMyCrip email"
                    : "Reminder: Please verify your MakeMyCrip email";
            emailService.send(email, subject, "email-otp-verify", vars);
        } catch (Exception e) {
            log.error("Failed to send email verification reminder to {}", email, e);
        }
    }

    // ─── Promotional Campaign ─────────────────────────────────────────────────

    @Async
    public void sendCampaignEmail(String email, String name, UUID userId,
                                  String subject, String body, String ctaText,
                                  String ctaUrl, String discountCode) {
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("name", name);
            vars.put("body", body);
            vars.put("ctaText", ctaText != null ? ctaText : "View Offer");
            vars.put("ctaUrl", ctaUrl != null ? ctaUrl : "/");
            vars.put("discountCode", discountCode);
            emailService.send(email, subject, "promotional-offer", vars);

            if (userId != null) {
                notificationService.create(CreateNotificationRequest.builder()
                        .userId(userId)
                        .type(NotificationType.OFFER)
                        .title(subject)
                        .message(discountCode != null
                                ? "Use code " + discountCode + " for exclusive savings!"
                                : "Check out this exclusive offer for you!")
                        .actionUrl(ctaUrl)
                        .category("OFFER")
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to send campaign email to {}", email, e);
        }
    }
}
