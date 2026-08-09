package com.makemycrip.promotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks per-user coupon usage to enforce per_user_limit.
 */
@Entity
@Table(name = "coupon_user_usage",
       uniqueConstraints = @UniqueConstraint(columnNames = {"promotion_id", "user_id", "booking_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponUserUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "promotion_id", nullable = false)
    private UUID promotionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "booking_id")
    private UUID bookingId;

    @CreationTimestamp
    @Column(name = "used_at", nullable = false)
    private LocalDateTime usedAt;
}
