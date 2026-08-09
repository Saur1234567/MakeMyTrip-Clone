package com.makemycrip.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Response from POST /api/v1/coupons/validate and GET /api/v1/coupons/available.
 *
 * The frontend MUST use discountAmount / finalAmount from this response —
 * never compute them client-side.
 */
@Data
@Builder
public class CouponValidateResponse {

    /** The normalised coupon code (uppercased). */
    private String code;

    /** Short human-readable label, e.g. "₹500 OFF" or "10% OFF". */
    private String label;

    /** Full promotion name / description. */
    private String description;

    /** FLAT or PERCENT */
    private String discountType;

    /** Raw discount value (e.g. 500 for FLAT, 10 for 10%). */
    private BigDecimal discountValue;

    /** Server-computed discount amount in ₹ — the ONLY value the frontend should use. */
    private BigDecimal discountAmount;

    /** Original booking amount before discount. */
    private BigDecimal originalAmount;

    /** Final payable amount after discount (originalAmount − discountAmount). */
    private BigDecimal finalAmount;

    /** Coupon scope: UNIVERSAL | HOTEL | CITY | ROOM_TYPE */
    private String scope;

    /** Whether this coupon can be stacked with others (informational). */
    private Boolean isStackable;

    /**
     * CSV of applicable payment methods, e.g. "all" or "card,netbanking".
     * Shown in the UI so users know which payment method to select.
     */
    private String applicablePaymentMethods;

    /** Minimum booking amount required (null = no minimum). */
    private BigDecimal minBookingAmount;

    /** Maximum discount cap (null = no cap). */
    private BigDecimal maxDiscountAmount;
}
