package com.makemycrip.hotel.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RoomTypeDto {
    private UUID id;
    private String name;
    private String description;
    private String roomCategory;
    private String bedType;
    private Integer maxOccupancy;
    private Integer maxAdults;
    private Integer maxChildren;
    private Integer roomSizeSqft;
    private String viewType;
    private String bathroomType;
    private String floorNumbers;
    private Boolean isActive;
    private Boolean isAvailableForBooking;
    private Integer sortOrder;
    private BigDecimal basePrice;
    private BigDecimal discountedPrice;
    private BigDecimal extraAdultCharge;
    private BigDecimal extraChildCharge;
    private Integer availableRooms;
    private List<AmenityDto> amenities;
    private List<ImageDto> images;
    private PriceBreakdownDto priceBreakdown;

    @Data
    @Builder
    public static class AmenityDto {
        private String amenityName;
        private String amenityIcon;
        private Boolean isComplimentary;
    }

    @Data
    @Builder
    public static class ImageDto {
        private java.util.UUID id;
        private String imageUrl;
        private String thumbnailUrl;
        private Boolean isPrimary;
    }

    @Data
    @Builder
    public static class PriceBreakdownDto {
        private BigDecimal basePrice;
        private List<AdjustmentDto> adjustments;
        private BigDecimal subtotal;
        private List<TaxDto> taxes;
        private BigDecimal totalTax;
        private BigDecimal convenienceFee;
        private BigDecimal grandTotal;
    }

    @Data
    @Builder
    public static class AdjustmentDto {
        private String name;
        private String type;
        private BigDecimal amount;
    }

    @Data
    @Builder
    public static class TaxDto {
        private String name;
        private BigDecimal amount;
    }
}
