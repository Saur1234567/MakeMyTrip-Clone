package com.makemycrip.pricing.entity;

import com.makemycrip.pricing.enums.AdjustmentType;
import com.makemycrip.pricing.enums.PricingRuleType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "hotel_id")
    private UUID hotelId;

    @Column(name = "room_type_id")
    private UUID roomTypeId;

    @Column(name = "rule_name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", length = 30)
    private PricingRuleType ruleType;

    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 0;

    @Column(name = "date_from")
    private LocalDate startDate;

    @Column(name = "date_to")
    private LocalDate endDate;

    @Column(name = "days_of_week", length = 20)
    private String daysOfWeek;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", length = 20)
    private AdjustmentType adjustmentType;

    @Column(name = "adjustment_value", precision = 10, scale = 2)
    private BigDecimal adjustmentValue;

    @Column(name = "min_nights_to_apply")
    @Builder.Default
    private Integer minNights = 1;

    @Column(name = "advance_booking_days_min")
    private Integer daysInAdvance;

    @Column(name = "advance_booking_days_max")
    private Integer daysInAdvanceMax;

    @Column(name = "occupancy_threshold_percent")
    private Integer occupancyThreshold;

    @Column(name = "device_type", length = 20)
    private String deviceType;

    @Column(name = "loyalty_tier", length = 20)
    private String loyaltyTier;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
