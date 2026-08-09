package com.makemycrip.notification.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CampaignRequest {
    private String name;
    private String subject;
    private String body;
    private String ctaText;
    private String ctaUrl;
    private String discountCode;
    private LocalDateTime expiresAt;
    /** ALL, BY_CITY, BY_USER_ID, CONDITION_BASED */
    private String targetType;
    /** Comma-separated city names */
    private String targetCities;
    /** Comma-separated user UUIDs */
    private String targetUserIds;
    /** RETURNING_CUSTOMER, NEVER_BOOKED, INACTIVE_X_DAYS, UPCOMING_CHECKIN */
    private String targetCondition;
    private String conditionValue;
    /** null = send immediately, future date = schedule */
    private LocalDateTime scheduledAt;
}
