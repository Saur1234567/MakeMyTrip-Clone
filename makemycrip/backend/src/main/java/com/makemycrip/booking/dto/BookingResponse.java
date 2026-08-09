package com.makemycrip.booking.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class BookingResponse {
    private UUID id;

    /** Serialized as "bookingRef" to match frontend */
    @JsonProperty("bookingRef")
    private String bookingReference;

    private String status;
    private String hotelName;
    private String hotelCity;
    private String hotelImageUrl;

    /** Hotel address — populated by service */
    private String hotelAddress;

    /** Hotel phone — populated by service */
    private String hotelPhone;

    private String roomTypeName;
    private LocalDate checkIn;
    private LocalDate checkOut;

    /** Serialized as "nights" to match frontend */
    @JsonProperty("nights")
    private int totalNights;

    private int adults;
    private int children;
    private BigDecimal baseAmount;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal convenienceFee;

    /** Add-on total amount — sum of all add-on totalPrices */
    private BigDecimal addOnAmount;

    private BigDecimal totalAmount;
    private String currency;
    private String couponCode;
    private BigDecimal couponDiscount;
    private String specialRequests;
    private String arrivalTime;
    private Boolean earlyCheckinRequested;
    private Boolean lateCheckoutRequested;
    private Boolean earlyCheckinApproved;
    private Boolean lateCheckoutApproved;
    private Map<String, Object> priceBreakdown;
    private LocalDateTime bookedAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private int loyaltyPointsEarned;

    /** Cancellation policy name (FLEXIBLE / MODERATE / STRICT / NON_REFUNDABLE) */
    private String cancellationPolicy;

    /** Check-in time string (e.g. "14:00") */
    private String checkInTime;

    /** Check-out time string (e.g. "11:00") */
    private String checkOutTime;

    /** Price lock expiry for payment page countdown */
    private LocalDateTime priceLockExpiresAt;

    /** Whether the user has already submitted a review for this booking */
    private Boolean hasReview;

    /** Hotel UUID — needed for review submission */
    private UUID hotelId;

    /** Primary guest full name */
    private String primaryGuestName;

    /** Primary guest email */
    private String guestEmail;

    /** Primary guest phone */
    private String guestPhone;

    private List<GuestDto> guests;
    private List<AddOnDto> addOns;
    private String paymentIntentClientSecret;

    @Data
    @Builder
    public static class GuestDto {
        private UUID id;
        private String guestType;
        private Boolean isPrimary;
        private String title;
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String nationality;
        private String idType;
    }

    @Data
    @Builder
    public static class AddOnDto {
        private UUID id;
        private String addOnType;
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private String status;
    }
}
