package com.makemycrip.hotel.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class HotelDetailDto {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String shortDescription;
    private String hotelType;
    private BigDecimal starRating;
    private LocalTime checkinTime;
    private LocalTime checkoutTime;
    private Integer totalFloors;
    private Integer totalRooms;
    private Integer yearBuilt;
    private Integer yearRenovated;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String country;
    private String pincode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String neighborhood;
    private String locality;
    private String status;
    private BigDecimal distanceFromAirport;
    private BigDecimal distanceFromCityCenter;
    private String primaryPhone;
    private String secondaryPhone;
    private String email;
    private String website;
    private String facebookUrl;
    private String instagramUrl;
    private String panNumber;
    private String cancellationPolicy;
    private String cancellationPolicyDetails;
    private Boolean petsAllowed;
    private Boolean smokingAllowed;
    private Boolean eventsAllowed;
    private Integer minimumAgeCheckin;
    private Boolean isFeatured;
    private Boolean isVerified;
    private Double guestRating;
    private Long reviewCount;
    private Map<String, BigDecimal> ratingBreakdown;
    private List<HotelImageDto> images;
    private Map<String, List<HotelAmenityDto>> amenitiesByCategory;
    private List<HotelPolicyDto> policies;
    private List<HotelNearbyPlaceDto> nearbyPlaces;
    private List<HotelFaqDto> faqs;
    private Boolean isWishlisted;

    // flat amenities list for admin (in addition to amenitiesByCategory)
    private List<HotelAmenityDto> amenities;

    @Data
    @Builder
    public static class HotelImageDto {
        private UUID id;
        private String imageUrl;
        private String thumbnailUrl;
        private String caption;
        private String category;
        private Integer sortOrder;
        private Boolean isPrimary;
    }

    @Data
    @Builder
    public static class HotelAmenityDto {
        private UUID id;
        private String amenityName;
        private String amenityIcon;
        private String category;
        private Boolean isPaid;
        private String priceInfo;
    }

    @Data
    @Builder
    public static class HotelPolicyDto {
        private UUID id;
        private String policyType;
        private String title;
        private String description;
    }

    @Data
    @Builder
    public static class HotelNearbyPlaceDto {
        private UUID id;
        private String placeName;
        private String placeType;
        private BigDecimal distanceKm;
        private Integer travelTimeMinutes;
    }

    @Data
    @Builder
    public static class HotelFaqDto {
        private UUID id;
        private String question;
        private String answer;
    }
}
