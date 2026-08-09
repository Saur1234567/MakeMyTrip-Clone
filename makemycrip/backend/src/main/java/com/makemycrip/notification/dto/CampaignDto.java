package com.makemycrip.notification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CampaignDto {
    private UUID id;
    private String name;
    private String subject;
    private String body;
    private String ctaText;
    private String ctaUrl;
    private String discountCode;
    private LocalDateTime expiresAt;
    private String status;
    private String targetType;
    private String targetCities;
    private String targetUserIds;
    private String targetCondition;
    private String conditionValue;
    private LocalDateTime scheduledAt;
    private LocalDateTime sentAt;
    private int totalSent;
    private LocalDateTime createdAt;
}
