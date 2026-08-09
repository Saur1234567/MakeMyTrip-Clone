package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryUpdateRequest {
    private Integer availableRooms;
    private BigDecimal adminOverridePrice;
    private BigDecimal minPriceFloor;
    private BigDecimal maxPriceCeiling;
    private Boolean isBlocked;
    private String blockReason;
    private Integer minNights;
    private Integer maxNights;
    private Boolean closedToArrival;
    private Boolean closedToDeparture;
}
