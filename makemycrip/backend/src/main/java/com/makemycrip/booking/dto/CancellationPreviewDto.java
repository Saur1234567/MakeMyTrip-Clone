package com.makemycrip.booking.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class CancellationPreviewDto {
    private String bookingReference;
    private BigDecimal totalPaid;
    private BigDecimal refundAmount;
    private BigDecimal penaltyAmount;
    private String cancellationPolicy;
    private String refundMessage;
    private int daysBeforeCheckIn;
}
