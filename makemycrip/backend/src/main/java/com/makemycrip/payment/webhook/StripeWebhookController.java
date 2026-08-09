package com.makemycrip.payment.webhook;

import com.makemycrip.booking.service.BookingService;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.payment.service.PaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.*;
import com.stripe.net.Webhook;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Payment provider webhooks")
public class StripeWebhookController {

    @Value("${app.stripe.webhook-secret}")
    private String webhookSecret;

    private final PaymentService paymentService;
    private final BookingService bookingService;

    @Operation(summary = "Stripe webhook endpoint")
    @PostMapping("/stripe")
    public ResponseEntity<ApiResponse<?>> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader,
            HttpServletRequest request) {

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(org.springframework.http.HttpStatus.BAD_REQUEST,
                            "Invalid webhook signature", request.getRequestURI()));
        }

        log.info("Stripe webhook received: type={} id={}", event.getType(), event.getId());

        try {
            switch (event.getType()) {
                case "payment_intent.succeeded" -> {
                    PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    String chargeId = pi.getLatestCharge();
                    paymentService.handlePaymentSucceeded(pi.getId(), chargeId);
                    String bookingId = pi.getMetadata().get("bookingId");
                    if (bookingId != null) {
                        bookingService.confirmBooking(UUID.fromString(bookingId), pi.getId(), null, null);
                    }
                }
                case "payment_intent.payment_failed" -> {
                    PaymentIntent pi = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    String failMsg = pi.getLastPaymentError() != null
                            ? pi.getLastPaymentError().getMessage() : "Payment failed";
                    paymentService.handlePaymentFailed(pi.getId(), failMsg);
                }
                case "charge.refund.updated" -> {
                    Charge charge = (Charge) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    if (charge.getRefunds() != null && !charge.getRefunds().getData().isEmpty()) {
                        com.stripe.model.Refund refund = charge.getRefunds().getData().get(0);
                        if ("succeeded".equals(refund.getStatus())) {
                            paymentService.handleRefundSucceeded(refund.getId());
                        }
                    }
                }
                default -> log.debug("Unhandled Stripe event type: {}", event.getType());
            }
        } catch (Exception e) {
            log.error("Error processing Stripe webhook event={}: {}", event.getType(), e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                            "Webhook processing failed", request.getRequestURI()));
        }

        return ResponseEntity.ok(ApiResponse.success("Webhook processed", "ok"));
    }
}
