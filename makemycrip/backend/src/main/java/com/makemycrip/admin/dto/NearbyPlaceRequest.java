package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NearbyPlaceRequest {
    private String placeName;
    private String placeType;
    private BigDecimal distanceKm;
    private Integer travelTimeMinutes;
    private BigDecimal latitude;
    private BigDecimal longitude;
}
