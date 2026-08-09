package com.makemycrip.hotel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class HotelSummaryDto {
    private UUID id;
    private String name;
    private String slug;
    private String shortDescription;
    private String hotelType;
    private BigDecimal starRating;
    private String city;
    /** Serialized as "locality" to match frontend Hotel interface */
    @JsonProperty("locality")
    private String neighborhood;
    private String addressLine1;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal distanceFromCityCenter;
    /** Serialized as "rating" to match frontend Hotel interface */
    @JsonProperty("rating")
    private Double guestRating;
    private Long reviewCount;
    /** Serialized as "discountedPrice" — the actual price to pay (after discounts) */
    @JsonProperty("discountedPrice")
    private BigDecimal startingPrice;
    /** Serialized as "basePrice" — the original undiscounted price (shown with strikethrough) */
    @JsonProperty("basePrice")
    private BigDecimal originalPrice;
    private String primaryImageUrl;
    /** Serialized as "amenities" to match frontend Hotel interface */
    @JsonProperty("amenities")
    private List<String> topAmenities;
    private Boolean isFeatured;
    private Boolean freeCancellation;
    /** Serialized as "minAvailableRooms" to match frontend Hotel interface */
    @JsonProperty("minAvailableRooms")
    private Integer availableRooms;
    private Boolean isWishlisted;
    /** Tax amount placeholder — computed on frontend if needed */
    @JsonProperty("taxAmount")
    private BigDecimal taxAmount;
}
