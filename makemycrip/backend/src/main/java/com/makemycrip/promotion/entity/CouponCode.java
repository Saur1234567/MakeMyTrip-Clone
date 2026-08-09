package com.makemycrip.promotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "coupon_codes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "promotion_id", nullable = false)
    private UUID promotionId;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "is_used")
    @Builder.Default
    private Boolean isUsed = false;

    @Column(name = "used_by")
    private UUID usedBy;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "is_single_use")
    @Builder.Default
    private Boolean isSingleUse = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
