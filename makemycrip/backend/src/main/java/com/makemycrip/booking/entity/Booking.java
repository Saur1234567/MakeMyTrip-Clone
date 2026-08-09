package com.makemycrip.booking.entity;

import com.makemycrip.booking.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_reference", unique = true, nullable = false)
    private String bookingReference;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "hotel_id")
    private UUID hotelId;

    @Column(name = "room_type_id")
    private UUID roomTypeId;

    @Column(name = "room_id")
    private UUID roomId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(name = "total_nights")
    private Integer totalNights;

    @Column(nullable = false)
    @Builder.Default
    private Integer adults = 1;

    @Builder.Default
    private Integer children = 0;

    @Builder.Default
    private Integer infants = 0;

    @Column(name = "base_amount", precision = 12, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 12, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "convenience_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal convenienceFee = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Builder.Default
    private String currency = "INR";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "price_breakdown", columnDefinition = "jsonb")
    private String priceBreakdown;

    @Column(name = "coupon_code")
    private String couponCode;

    @Column(name = "coupon_discount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal couponDiscount = BigDecimal.ZERO;

    @Column(name = "promotion_id")
    private UUID promotionId;

    @Column(name = "special_requests")
    private String specialRequests;

    @Column(name = "internal_notes")
    private String internalNotes;

    @Column(name = "arrival_time")
    private String arrivalTime;

    @Column(name = "early_checkin_requested")
    @Builder.Default
    private Boolean earlyCheckinRequested = false;

    @Column(name = "late_checkout_requested")
    @Builder.Default
    private Boolean lateCheckoutRequested = false;

    @Column(name = "early_checkin_approved")
    @Builder.Default
    private Boolean earlyCheckinApproved = false;

    @Column(name = "late_checkout_approved")
    @Builder.Default
    private Boolean lateCheckoutApproved = false;

    @Column(name = "early_checkin_charge", precision = 10, scale = 2)
    private BigDecimal earlyCheckinCharge;

    @Column(name = "late_checkout_charge", precision = 10, scale = 2)
    private BigDecimal lateCheckoutCharge;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BookingSource source = BookingSource.WEB;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type")
    private com.makemycrip.user.enums.DeviceType deviceType;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "booked_at", updatable = false)
    private LocalDateTime bookedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancelled_by")
    private CancelledBy cancelledBy;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_in_by")
    private UUID checkedInBy;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    @Column(name = "no_show_at")
    private LocalDateTime noShowAt;

    @Column(name = "loyalty_points_earned")
    @Builder.Default
    private Integer loyaltyPointsEarned = 0;

    @Column(name = "loyalty_points_redeemed")
    @Builder.Default
    private Integer loyaltyPointsRedeemed = 0;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingGuest> guests = new ArrayList<>();

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingModificationLog> modificationLogs = new ArrayList<>();

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingAddOn> addOns = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        bookedAt = LocalDateTime.now();
    }
}
