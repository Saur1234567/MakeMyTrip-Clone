package com.makemycrip.promotion.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

/**
 * Request body for POST /api/v1/coupons/validate
 *
 * The frontend sends the coupon code + full booking context.
 * The server computes and returns the validated discount — never trusting any
 * client-supplied discount value.
 *
 * Scope-matching fields (hotelId, city, roomType) are used to enforce
 * HOTEL / CITY / ROOM_TYPE scoped coupons server-side.
 */
@Data
public class CouponValidateRequest {

    @NotBlank(message = "Coupon code is required")
    private String code;

    /** Booking reference — used to look up the authoritative total amount. */
    @NotBlank(message = "Booking reference is required")
    private String bookingRef;

    /**
     * Payment method selected by the user: card | upi | wallet | netbanking | cod
     * Used for method-specific coupon restrictions.
     */
    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    /**
     * Hotel UUID — used to validate HOTEL-scoped coupons.
     * Should be the hotel ID of the booking.
     */
    private UUID hotelId;

    /**
     * City of the hotel — used to validate CITY-scoped coupons.
     * Should match the hotel's city field (case-insensitive).
     */
    private String city;

    /**
     * Room type name — used to validate ROOM_TYPE-scoped coupons.
     * Should match the booking's room type name (e.g. "Deluxe", "Suite").
     */
    private String roomType;

    /**
     * Optional sub-selection fields for bank/wallet/UPI-specific coupons.
     * Null means the user has not selected one yet.
     */
    private String selectedBank;
    private String selectedWallet;
    private String selectedUpiApp;
}
