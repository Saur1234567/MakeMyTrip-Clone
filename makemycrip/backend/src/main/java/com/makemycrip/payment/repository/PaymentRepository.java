package com.makemycrip.payment.repository;

import com.makemycrip.payment.entity.Payment;
import com.makemycrip.payment.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByBookingId(UUID bookingId);

    Optional<Payment> findByStripePaymentIntentId(String paymentIntentId);

    Optional<Payment> findByStripeChargeId(String chargeId);

    boolean existsByStripeChargeId(String chargeId);

    List<Payment> findByBookingIdAndStatus(UUID bookingId, PaymentStatus status);
}
