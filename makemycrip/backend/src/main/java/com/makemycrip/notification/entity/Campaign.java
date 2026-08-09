package com.makemycrip.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 300)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "cta_text", length = 100)
    private String ctaText;

    @Column(name = "cta_url", length = 500)
    private String ctaUrl;

    @Column(name = "discount_code", length = 50)
    private String discountCode;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /** DRAFT, SCHEDULED, SENDING, SENT, CANCELLED */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";

    /**
     * ALL, BY_CITY, BY_USER_ID, CONDITION_BASED
     */
    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    /** Comma-separated city names for BY_CITY */
    @Column(name = "target_cities", columnDefinition = "TEXT")
    private String targetCities;

    /** Comma-separated user UUIDs for BY_USER_ID */
    @Column(name = "target_user_ids", columnDefinition = "TEXT")
    private String targetUserIds;

    /**
     * Condition name for CONDITION_BASED:
     * RETURNING_CUSTOMER, NEVER_BOOKED, INACTIVE_X_DAYS, UPCOMING_CHECKIN
     */
    @Column(name = "target_condition", length = 100)
    private String targetCondition;

    /** Numeric value for condition (e.g. days for INACTIVE_X_DAYS) */
    @Column(name = "condition_value", length = 100)
    private String conditionValue;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "total_sent")
    @Builder.Default
    private int totalSent = 0;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
