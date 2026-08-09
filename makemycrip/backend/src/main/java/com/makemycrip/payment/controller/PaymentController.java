package com.makemycrip.payment.controller;

import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.booking.service.BookingService;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.payment.service.PaymentService;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Value("${app.stripe.publishable-key}")
    private String stripePublishableKey;

    /** Public endpoint — returns the Stripe publishable key so the frontend can initialise Stripe.js */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse<Map<String, String>>> getStripeConfig() {
        return ResponseEntity.ok(ApiResponse.success(Map.of("publishableKey", stripePublishableKey)));
    }

    @PostMapping("/create-intent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> createIntent(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal String userId) {

        String bookingRef = request.get("bookingRef");
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingRef));

        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String clientSecret = paymentService.createPaymentIntent(
                booking.getId(),
                booking.getTotalAmount(),
                booking.getCurrency(),
                user.getEmail()
        );

        return ResponseEntity.ok(ApiResponse.success(Map.of("clientSecret", clientSecret)));
    }

    /**
     * Called by the frontend after stripe.confirmCardPayment() succeeds (or after
     * simulated payment for UPI/Wallet/NetBanking/COD).
     *
     * Security: the coupon code is re-validated server-side here — the frontend
     * sends only the code string, never a discount amount.  The server recomputes
     * the discount and records the redemption atomically.
     */
    @PostMapping("/confirm")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> confirmPayment(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal String userId) {

        String bookingRef      = request.get("bookingRef");
        String paymentIntentId = request.get("paymentIntentId");   // null for non-Stripe methods
        String couponCode      = request.get("couponCode");         // may be null

        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingRef));

        // 1. Update Payment entity status → SUCCEEDED (Stripe methods only)
        if (paymentIntentId != null && !paymentIntentId.isBlank()) {
            paymentService.confirmPaymentIntent(booking.getId(), paymentIntentId);
        }

        // 2. Update Booking status → CONFIRMED (decrement inventory, award loyalty points, send email)
        //    Coupon redemption is handled atomically inside confirmBooking to avoid
        //    the detached-entity overwrite problem (confirmBooking reloads from DB).
        bookingService.confirmBooking(booking.getId(), paymentIntentId, couponCode, userId);

        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
