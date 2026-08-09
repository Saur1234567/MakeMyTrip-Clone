package com.makemycrip.pricing.dto;

import com.makemycrip.user.enums.DeviceType;
import com.makemycrip.user.enums.LoyaltyTier;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class PricingContext {
    private UUID roomTypeId;
    private UUID hotelId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private int adults;
    private int children;
    private UUID userId;
    private DeviceType deviceType;
    private LoyaltyTier loyaltyTier;
    private String couponCode;
    private String sessionId;
    private String ipAddress;
}
