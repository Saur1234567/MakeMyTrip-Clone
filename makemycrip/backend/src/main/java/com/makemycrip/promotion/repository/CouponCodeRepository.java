package com.makemycrip.promotion.repository;

import com.makemycrip.promotion.entity.CouponCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CouponCodeRepository extends JpaRepository<CouponCode, UUID> {
    List<CouponCode> findByPromotionIdOrderByCreatedAtDesc(UUID promotionId);
    Optional<CouponCode> findByCode(String code);
    long countByPromotionIdAndIsUsedFalse(UUID promotionId);
    long countByPromotionId(UUID promotionId);
}
