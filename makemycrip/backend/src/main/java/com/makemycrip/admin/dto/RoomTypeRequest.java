package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RoomTypeRequest {
    private String name;
    private String description;
    private String roomCategory;
    private String bedType;
    private Integer maxOccupancy;
    private Integer maxAdults;
    private Integer maxChildren;
    private Integer roomSizeSqft;
    private String floorNumbers;
    private String viewType;
    private String bathroomType;
    private BigDecimal basePrice;
    private BigDecimal extraAdultCharge;
    private BigDecimal extraChildCharge;
    private Boolean isActive;
    private Boolean isAvailableForBooking;
    private Integer sortOrder;
}
