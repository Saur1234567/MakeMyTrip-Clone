package com.makemycrip.pricing.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TaxSlabRequest {
    private BigDecimal minAmount;
    private BigDecimal maxAmount;  // null = no ceiling
    private BigDecimal gstRate;
    private String label;
    private Boolean isActive;
}
