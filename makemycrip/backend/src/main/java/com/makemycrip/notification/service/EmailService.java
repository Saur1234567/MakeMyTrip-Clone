package com.makemycrip.notification.service;

import com.makemycrip.notification.entity.EmailLog;
import com.makemycrip.notification.enums.EmailStatus;
import com.makemycrip.notification.repository.EmailLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final EmailLogRepository emailLogRepository;

    @Value("${spring.mail.username:noreply@makemycrip.com}")
    private String fromEmail;

    public void send(String toEmail, String subject, String templateName, Map<String, Object> variables) {
        send(toEmail, subject, templateName, variables, null, null, null);
    }

    public void send(String toEmail, String subject, String templateName,
                     Map<String, Object> variables, byte[] attachment,
                     String attachmentName, String attachmentContentType) {
        EmailLog logEntry = EmailLog.builder()
                .toEmail(toEmail)
                .subject(subject)
                .templateName(templateName)
                .status(EmailStatus.QUEUED)
                .build();
        try {
            Context context = new Context();
            context.setVariables(variables);
            String htmlContent = templateEngine.process("email/" + templateName, context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, attachment != null, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            if (attachment != null && attachmentName != null) {
                helper.addAttachment(attachmentName,
                        () -> new java.io.ByteArrayInputStream(attachment),
                        attachmentContentType);
            }

            mailSender.send(message);
            logEntry.setStatus(EmailStatus.SENT);
            logEntry.setSentAt(LocalDateTime.now());
            log.info("Email sent: to={} template={}", toEmail, templateName);
        } catch (Exception e) {
            logEntry.setStatus(EmailStatus.FAILED);
            logEntry.setErrorMessage(e.getMessage());
            log.error("Failed to send email to={} template={}: {}", toEmail, templateName, e.getMessage(), e);
        } finally {
            emailLogRepository.save(logEntry);
        }
    }

    public void sendBookingConfirmation(String email, JsonNode event) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("bookingRef", event.path("bookingRef").asText());
        vars.put("guestName", event.path("guestName").asText("Guest"));
        vars.put("hotelName", event.path("hotelName").asText());
        vars.put("checkIn", event.path("checkIn").asText());
        vars.put("checkOut", event.path("checkOut").asText());
        vars.put("totalAmount", event.path("totalAmount").asText());
        send(email, "Booking Confirmed - " + event.path("bookingRef").asText(),
                "booking-confirmation", vars);
    }

    public void sendTemplatedEmail(String type, String to, JsonNode payload) {
        Map<String, Object> vars = new HashMap<>();
        payload.fields().forEachRemaining(entry -> vars.put(entry.getKey(), entry.getValue().asText()));

        String subject = switch (type) {
            case "WELCOME" -> "Welcome to MakeMyCrip!";
            case "EMAIL_VERIFICATION" -> "Verify Your Email Address";
            case "PASSWORD_RESET" -> "Reset Your Password";
            case "PAYMENT_SUCCESS" -> "Payment Successful";
            case "PAYMENT_FAILED" -> "Payment Failed";
            case "REFUND_CONFIRMATION" -> "Refund Initiated";
            case "CHECK_IN_REMINDER" -> "Check-in Reminder";
            case "REVIEW_REQUEST" -> "How Was Your Stay?";
            case "LOYALTY_TIER_UPGRADE" -> "Congratulations! Tier Upgrade";
            default -> "MakeMyCrip Notification";
        };

        String template = type.toLowerCase().replace("_", "-");
        send(to, subject, template, vars);
    }
}
