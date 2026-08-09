package com.makemycrip.payment.service;

import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.common.exception.PaymentException;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.payment.entity.Payment;
import com.makemycrip.payment.entity.Refund;
import com.makemycrip.payment.enums.PaymentStatus;
import com.makemycrip.payment.enums.PaymentType;
import com.makemycrip.payment.enums.RefundStatus;
import com.makemycrip.payment.repository.PaymentRepository;
import com.makemycrip.payment.repository.RefundRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    @Value("${app.stripe.secret-key}")
    private String stripeSecretKey;

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final BookingRepository bookingRepository;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public String createPaymentIntent(UUID bookingId, BigDecimal amount, String currency, String customerEmail) {
        try {
            long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInPaise)
                    .setCurrency(currency.toLowerCase())
                    .setReceiptEmail(customerEmail)
                    .putMetadata("bookingId", bookingId.toString())
                    // Disable redirect-based payment methods so card confirmation works
                    // without a return_url (required for CardElement / confirmCardPayment)
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .setAllowRedirects(
                                            PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                                    .build())
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            Payment payment = Payment.builder()
                    .bookingId(bookingId)
                    .stripePaymentIntentId(paymentIntent.getId())
                    .paymentType(PaymentType.FULL)
                    .amount(amount)
                    .currency(currency)
                    .status(PaymentStatus.PENDING)
                    .build();
            paymentRepository.save(payment);

            log.info("PaymentIntent created: paymentIntentId={} bookingId={}", paymentIntent.getId(), bookingId);
            return paymentIntent.getClientSecret();
        } catch (StripeException e) {
            log.error("Stripe error creating PaymentIntent for bookingId={}: {}", bookingId, e.getMessage(), e);
            throw new PaymentException("Failed to initialize payment: " + e.getMessage(), "STRIPE_ERROR", e);
        }
    }

    @Transactional
    public void handlePaymentSucceeded(String paymentIntentId, String chargeId) {
        // Idempotency check
        if (paymentRepository.existsByStripeChargeId(chargeId)) {
            log.warn("Duplicate webhook: chargeId={} already processed", chargeId);
            return;
        }

        Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for intent: " + paymentIntentId));

        payment.setStatus(PaymentStatus.SUCCEEDED);
        payment.setStripeChargeId(chargeId);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        log.info("Payment succeeded: paymentId={} bookingId={}", payment.getId(), payment.getBookingId());
    }

    @Transactional
    public void handlePaymentFailed(String paymentIntentId, String failureMessage) {
        paymentRepository.findByStripePaymentIntentId(paymentIntentId).ifPresent(payment -> {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(failureMessage);
            paymentRepository.save(payment);
            log.warn("Payment failed: paymentId={} bookingId={} reason={}",
                    payment.getId(), payment.getBookingId(), failureMessage);
        });
    }

    @Transactional
    public void processRefund(UUID bookingId, BigDecimal amount, String reason, String initiatedByUserId) {
        List<Payment> payments = paymentRepository.findByBookingIdAndStatus(bookingId, PaymentStatus.SUCCEEDED);
        if (payments.isEmpty()) {
            log.warn("No successful payment found for bookingId={}, skipping refund", bookingId);
            return;
        }
        Payment payment = payments.get(0);

        try {
            long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();
            RefundCreateParams params = RefundCreateParams.builder()
                    .setCharge(payment.getStripeChargeId())
                    .setAmount(amountInPaise)
                    .setReason(RefundCreateParams.Reason.REQUESTED_BY_CUSTOMER)
                    .build();

            com.stripe.model.Refund stripeRefund = com.stripe.model.Refund.create(params);

            Refund refund = Refund.builder()
                    .bookingId(bookingId)
                    .paymentId(payment.getId())
                    .stripeRefundId(stripeRefund.getId())
                    .amount(amount)
                    .reason(reason)
                    .status(RefundStatus.PROCESSING)
                    .initiatedBy(UUID.fromString(initiatedByUserId))
                    .initiatedByRole("USER")
                    .build();
            refundRepository.save(refund);

            log.info("Refund initiated: refundId={} bookingId={} amount={}", refund.getId(), bookingId, amount);
        } catch (StripeException e) {
            Refund failedRefund = Refund.builder()
                    .bookingId(bookingId)
                    .paymentId(payment.getId())
                    .amount(amount)
                    .reason(reason)
                    .status(RefundStatus.FAILED)
                    .initiatedBy(UUID.fromString(initiatedByUserId))
                    .build();
            refundRepository.save(failedRefund);
            log.error("Stripe refund failed for bookingId={}: {}", bookingId, e.getMessage(), e);
        }
    }

    @Transactional
    public void handleRefundSucceeded(String stripeRefundId) {
        refundRepository.findAll().stream()
                .filter(r -> stripeRefundId.equals(r.getStripeRefundId()))
                .findFirst()
                .ifPresent(refund -> {
                    refund.setStatus(RefundStatus.SUCCEEDED);
                    refund.setProcessedAt(LocalDateTime.now());
                    refundRepository.save(refund);
                    log.info("Refund succeeded: refundId={}", refund.getId());
                });
    }

    @Transactional
    public void confirmPaymentIntent(UUID bookingId, String paymentIntentId) {
        try {
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            if ("succeeded".equals(intent.getStatus())) {
                String chargeId = intent.getLatestCharge();
                handlePaymentSucceeded(paymentIntentId, chargeId != null ? chargeId : paymentIntentId);
            }
        } catch (StripeException e) {
            log.error("Error confirming PaymentIntent {}: {}", paymentIntentId, e.getMessage(), e);
            throw new PaymentException("Payment confirmation failed: " + e.getMessage(), "STRIPE_ERROR", e);
        }
    }

    public List<Payment> getPaymentsByBooking(UUID bookingId) {
        return paymentRepository.findByBookingId(bookingId);
    }

    /**
     * Retrieves the Stripe PaymentIntent clientSecret for a PAYMENT_PENDING booking.
     * Used by getBookingDetail so the payment page can confirm the existing PaymentIntent
     * without creating a duplicate.
     */
    public String getClientSecretForBooking(UUID bookingId) {
        return paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PENDING
                        && p.getStripePaymentIntentId() != null)
                .findFirst()
                .map(p -> {
                    try {
                        PaymentIntent pi = PaymentIntent.retrieve(p.getStripePaymentIntentId());
                        return pi.getClientSecret();
                    } catch (StripeException e) {
                        log.warn("Could not retrieve clientSecret for bookingId={}: {}", bookingId, e.getMessage());
                        return null;
                    }
                })
                .orElse(null);
    }
}
