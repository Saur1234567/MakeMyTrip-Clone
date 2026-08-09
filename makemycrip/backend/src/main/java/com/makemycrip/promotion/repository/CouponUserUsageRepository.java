package com.makemycrip.promotion.repository;

import com.makemycrip.promotion.entity.CouponUserUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CouponUserUsageRepository extends JpaRepository<CouponUserUsage, UUID> {

    /** How many times this user has used this promotion (across all bookings). */
    long countByPromotionIdAndUserId(UUID promotionId, UUID userId);

    /** Check if this specific booking already has this coupon applied (replay guard). */
    boolean existsByPromotionIdAndBookingId(UUID promotionId, UUID bookingId);
}
