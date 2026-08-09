package com.makemycrip.pricing.repository;

import com.makemycrip.pricing.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {

    List<PricingRule> findByHotelIdAndIsActiveTrueOrderByPriorityDesc(UUID hotelId);

    List<PricingRule> findByHotelIdAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            UUID hotelId, LocalDate start, LocalDate end);
}
