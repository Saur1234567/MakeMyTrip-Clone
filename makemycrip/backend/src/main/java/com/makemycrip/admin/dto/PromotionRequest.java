package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PromotionRequest {
    private String promotionName;
    private String promotionType;
    private String bannerImageUrl;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minBookingAmount;
    private Integer minNights;
    private List<UUID> applicableRoomTypeIds;
    private LocalDateTime validFrom;
    private LocalDateTime validUntil;
    private LocalDate bookingWindowStart;
    private LocalDate bookingWindowEnd;
    private Integer totalUsageLimit;
    private Integer perUserLimit;
    private Boolean isActive;
    private UUID hotelId;
}
