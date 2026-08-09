package com.makemycrip.pricing.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PricingResult {
    private BigDecimal basePrice;
    private BigDecimal pricePerNight;
    private BigDecimal totalForStay;
    private List<PriceAdjustment> adjustments;
    private BigDecimal subtotalAfterAdjustments;
    private List<TaxLine> taxBreakdown;
    private BigDecimal totalTax;
    private BigDecimal convenienceFee;
    private BigDecimal grandTotal;
    private LocalDateTime priceLockedUntil;
    private int nights;

    @Data
    @Builder
    public static class PriceAdjustment {
        private String name;
        private String type; // SURCHARGE or DISCOUNT
        private BigDecimal amount;
        private String ruleType;
    }

    @Data
    @Builder
    public static class TaxLine {
        private String name;
        private BigDecimal rate;
        private BigDecimal amount;
    }
}
