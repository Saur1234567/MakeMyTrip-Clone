package com.makemycrip.promotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "promotions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "hotel_id")
    private UUID hotelId;

    @Column(name = "promotion_name", nullable = false)
    private String promotionName;

    @Column(name = "promotion_type", length = 30)
    private String promotionType;

    @Column(name = "banner_image_url")
    private String bannerImageUrl;

    @Column(name = "discount_type", length = 20)
    private String discountType;

    @Column(name = "discount_value", precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "min_booking_amount", precision = 12, scale = 2)
    private BigDecimal minBookingAmount;

    @Column(name = "min_nights")
    @Builder.Default
    private Integer minNights = 1;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_until")
    private LocalDateTime validUntil;

    @Column(name = "booking_window_start")
    private LocalDate bookingWindowStart;

    @Column(name = "booking_window_end")
    private LocalDate bookingWindowEnd;

    @Column(name = "total_usage_limit")
    private Integer totalUsageLimit;

    @Column(name = "current_usage")
    @Builder.Default
    private Integer currentUsage = 0;

    @Column(name = "per_user_limit")
    @Builder.Default
    private Integer perUserLimit = 1;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by")
    private UUID createdBy;

    /** CSV of allowed payment methods: 'all' | 'card,netbanking' | 'upi' | 'wallet' */
    @Column(name = "applicable_payment_methods")
    private String applicablePaymentMethods;

    /** CSV of allowed bank IDs, e.g. 'HDFC,SBI'. Null = any bank. */
    @Column(name = "applicable_banks")
    private String applicableBanks;

    /** CSV of allowed wallet IDs, e.g. 'paytm'. Null = any wallet. */
    @Column(name = "applicable_wallets")
    private String applicableWallets;

    /** CSV of allowed UPI app IDs, e.g. 'gpay'. Null = any UPI app. */
    @Column(name = "applicable_upi_apps")
    private String applicableUpiApps;

    /**
     * Coupon scope: UNIVERSAL | HOTEL | CITY | ROOM_TYPE
     * UNIVERSAL = applies to all bookings
     * HOTEL     = only for bookings at the hotel referenced by hotel_id
     * CITY      = only for bookings in the city stored in the city column
     * ROOM_TYPE = only for bookings of the room type(s) in the room_type column (CSV)
     */
    @Column(name = "scope", length = 20)
    @Builder.Default
    private String scope = "UNIVERSAL";

    /**
     * For CITY scope: the city name this coupon is restricted to (case-insensitive match).
     */
    @Column(name = "city", length = 100)
    private String city;

    /**
     * For ROOM_TYPE scope: CSV of room type names, e.g. 'Deluxe,Suite'.
     * Matched case-insensitively against the booking's room type name.
     */
    @Column(name = "room_type", length = 100)
    private String roomType;

    /**
     * Whether this coupon can be stacked with other coupons in the same booking.
     * Currently informational — the service enforces single-coupon-per-booking.
     */
    @Column(name = "is_stackable")
    @Builder.Default
    private Boolean isStackable = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
