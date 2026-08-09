package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PricingRuleRequest {
    private String name;
    private String ruleType;
    private Integer priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private String daysOfWeek;
    private String adjustmentType;
    private BigDecimal adjustmentValue;
    private Integer minNights;
    private Integer daysInAdvance;
    private Integer daysInAdvanceMax;
    private Integer occupancyThreshold;
    private String deviceType;
    private String loyaltyTier;
    private Boolean isActive;
    private List<UUID> applicableRoomTypeIds;
}
