package com.makemycrip.pricing.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TaxFeeRequest {
    private String feeName;
    /** FLAT or PERCENT */
    private String feeType;
    private BigDecimal amount;
    /** GLOBAL or HOTEL */
    private String scope;
    private UUID hotelId;
    private Boolean isActive;
    private Integer displayOrder;
}
