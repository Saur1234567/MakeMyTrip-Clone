package com.makemycrip.admin.service;

import com.makemycrip.admin.dto.PricingRuleRequest;
import com.makemycrip.admin.dto.PromotionRequest;
import com.makemycrip.common.audit.AuditService;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.pricing.entity.PricingRule;
import com.makemycrip.pricing.enums.AdjustmentType;
import com.makemycrip.pricing.enums.PricingRuleType;
import com.makemycrip.pricing.repository.PricingRuleRepository;
import com.makemycrip.promotion.entity.CouponCode;
import com.makemycrip.promotion.entity.Promotion;
import com.makemycrip.promotion.repository.CouponCodeRepository;
import com.makemycrip.promotion.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPromotionService {

    private final PromotionRepository promotionRepository;
    private final CouponCodeRepository couponCodeRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final AuditService auditService;

    // ── Promotions ───────────────────────────────────────────────────────────────

    public Page<Promotion> listPromotions(int page, int size) {
        return promotionRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional
    public Promotion createPromotion(PromotionRequest request, UUID adminId) {
        Promotion promo = Promotion.builder()
                .hotelId(request.getHotelId())
                .promotionName(request.getPromotionName())
                .promotionType(request.getPromotionType())
                .bannerImageUrl(request.getBannerImageUrl())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .minBookingAmount(request.getMinBookingAmount())
                .minNights(request.getMinNights() != null ? request.getMinNights() : 1)
                .validFrom(request.getValidFrom())
                .validUntil(request.getValidUntil())
                .bookingWindowStart(request.getBookingWindowStart())
                .bookingWindowEnd(request.getBookingWindowEnd())
                .totalUsageLimit(request.getTotalUsageLimit())
                .perUserLimit(request.getPerUserLimit() != null ? request.getPerUserLimit() : 1)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy(adminId)
                .build();
        Promotion saved = promotionRepository.save(promo);
        auditService.log(adminId, "CREATE_PROMOTION", "Promotion", saved.getId(), null, saved, null, null);
        return saved;
    }

    @Transactional
    public Promotion updatePromotion(UUID promoId, PromotionRequest request, UUID adminId) {
        Promotion promo = promotionRepository.findById(promoId)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
        if (request.getPromotionName() != null) promo.setPromotionName(request.getPromotionName());
        if (request.getPromotionType() != null) promo.setPromotionType(request.getPromotionType());
        if (request.getBannerImageUrl() != null) promo.setBannerImageUrl(request.getBannerImageUrl());
        if (request.getDiscountType() != null) promo.setDiscountType(request.getDiscountType());
        if (request.getDiscountValue() != null) promo.setDiscountValue(request.getDiscountValue());
        if (request.getMaxDiscountAmount() != null) promo.setMaxDiscountAmount(request.getMaxDiscountAmount());
        if (request.getMinBookingAmount() != null) promo.setMinBookingAmount(request.getMinBookingAmount());
        if (request.getMinNights() != null) promo.setMinNights(request.getMinNights());
        if (request.getValidFrom() != null) promo.setValidFrom(request.getValidFrom());
        if (request.getValidUntil() != null) promo.setValidUntil(request.getValidUntil());
        if (request.getBookingWindowStart() != null) promo.setBookingWindowStart(request.getBookingWindowStart());
        if (request.getBookingWindowEnd() != null) promo.setBookingWindowEnd(request.getBookingWindowEnd());
        if (request.getTotalUsageLimit() != null) promo.setTotalUsageLimit(request.getTotalUsageLimit());
        if (request.getPerUserLimit() != null) promo.setPerUserLimit(request.getPerUserLimit());
        if (request.getIsActive() != null) promo.setIsActive(request.getIsActive());
        promotionRepository.save(promo);
        auditService.log(adminId, "UPDATE_PROMOTION", "Promotion", promoId, null, promo, null, null);
        return promo;
    }

    @Transactional
    public void deletePromotion(UUID promoId, UUID adminId) {
        promotionRepository.findById(promoId)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
        promotionRepository.deleteById(promoId);
        auditService.log(adminId, "DELETE_PROMOTION", "Promotion", promoId, null, null, null, null);
    }

    @Transactional
    public Promotion toggleActive(UUID promoId, UUID adminId) {
        Promotion promo = promotionRepository.findById(promoId)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
        promo.setIsActive(!promo.getIsActive());
        promotionRepository.save(promo);
        return promo;
    }

    // ── Coupons ──────────────────────────────────────────────────────────────────

    public List<CouponCode> listCoupons(UUID promoId) {
        return couponCodeRepository.findByPromotionIdOrderByCreatedAtDesc(promoId);
    }

    @Transactional
    public List<CouponCode> generateCoupons(UUID promoId, int count, UUID adminId) {
        promotionRepository.findById(promoId)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
        List<CouponCode> codes = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String code = generateUniqueCode();
            CouponCode coupon = CouponCode.builder()
                    .promotionId(promoId)
                    .code(code)
                    .isUsed(false)
                    .build();
            codes.add(couponCodeRepository.save(coupon));
        }
        auditService.log(adminId, "GENERATE_COUPONS", "Promotion", promoId, null,
                Map.of("count", count), null, null);
        return codes;
    }

    @Transactional
    public void deleteCoupon(UUID couponId, UUID adminId) {
        couponCodeRepository.deleteById(couponId);
        auditService.log(adminId, "DELETE_COUPON", "CouponCode", couponId, null, null, null, null);
    }

    private String generateUniqueCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random random = new Random();
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        String code = sb.toString();
        // Ensure uniqueness
        if (couponCodeRepository.findByCode(code).isPresent()) {
            return generateUniqueCode();
        }
        return code;
    }

    // ── Pricing Rules ────────────────────────────────────────────────────────────

    public List<PricingRule> listPricingRules(UUID hotelId) {
        return pricingRuleRepository.findByHotelIdAndIsActiveTrueOrderByPriorityDesc(hotelId);
    }

    public List<PricingRule> listAllPricingRules(UUID hotelId) {
        return pricingRuleRepository.findAll().stream()
                .filter(r -> hotelId == null || hotelId.equals(r.getHotelId()))
                .sorted(Comparator.comparingInt(PricingRule::getPriority).reversed())
                .toList();
    }

    @Transactional
    public PricingRule createPricingRule(UUID hotelId, PricingRuleRequest request, UUID adminId) {
        PricingRule rule = PricingRule.builder()
                .hotelId(hotelId)
                .name(request.getName())
                .ruleType(request.getRuleType() != null ? safeEnum(PricingRuleType.class, request.getRuleType()) : null)
                .priority(request.getPriority() != null ? request.getPriority() : 0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .daysOfWeek(request.getDaysOfWeek())
                .adjustmentType(request.getAdjustmentType() != null ? safeEnum(AdjustmentType.class, request.getAdjustmentType()) : null)
                .adjustmentValue(request.getAdjustmentValue())
                .minNights(request.getMinNights() != null ? request.getMinNights() : 1)
                .daysInAdvance(request.getDaysInAdvance())
                .daysInAdvanceMax(request.getDaysInAdvanceMax())
                .occupancyThreshold(request.getOccupancyThreshold())
                .deviceType(request.getDeviceType())
                .loyaltyTier(request.getLoyaltyTier())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy(adminId)
                .build();
        PricingRule saved = pricingRuleRepository.save(rule);
        auditService.log(adminId, "CREATE_PRICING_RULE", "PricingRule", saved.getId(), null, saved, null, null);
        return saved;
    }

    @Transactional
    public PricingRule updatePricingRule(UUID ruleId, PricingRuleRequest request, UUID adminId) {
        PricingRule rule = pricingRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found"));
        if (request.getName() != null) rule.setName(request.getName());
        if (request.getRuleType() != null) rule.setRuleType(safeEnum(PricingRuleType.class, request.getRuleType()));
        if (request.getPriority() != null) rule.setPriority(request.getPriority());
        if (request.getStartDate() != null) rule.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) rule.setEndDate(request.getEndDate());
        if (request.getDaysOfWeek() != null) rule.setDaysOfWeek(request.getDaysOfWeek());
        if (request.getAdjustmentType() != null) rule.setAdjustmentType(safeEnum(AdjustmentType.class, request.getAdjustmentType()));
        if (request.getAdjustmentValue() != null) rule.setAdjustmentValue(request.getAdjustmentValue());
        if (request.getMinNights() != null) rule.setMinNights(request.getMinNights());
        if (request.getDaysInAdvance() != null) rule.setDaysInAdvance(request.getDaysInAdvance());
        if (request.getDaysInAdvanceMax() != null) rule.setDaysInAdvanceMax(request.getDaysInAdvanceMax());
        if (request.getOccupancyThreshold() != null) rule.setOccupancyThreshold(request.getOccupancyThreshold());
        if (request.getDeviceType() != null) rule.setDeviceType(request.getDeviceType());
        if (request.getLoyaltyTier() != null) rule.setLoyaltyTier(request.getLoyaltyTier());
        if (request.getIsActive() != null) rule.setIsActive(request.getIsActive());
        pricingRuleRepository.save(rule);
        auditService.log(adminId, "UPDATE_PRICING_RULE", "PricingRule", ruleId, null, rule, null, null);
        return rule;
    }

    @Transactional
    public void deletePricingRule(UUID ruleId, UUID adminId) {
        pricingRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found"));
        pricingRuleRepository.deleteById(ruleId);
        auditService.log(adminId, "DELETE_PRICING_RULE", "PricingRule", ruleId, null, null, null, null);
    }

    @Transactional
    public PricingRule togglePricingRule(UUID ruleId, UUID adminId) {
        PricingRule rule = pricingRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found"));
        rule.setIsActive(!rule.getIsActive());
        pricingRuleRepository.save(rule);
        return rule;
    }

    private <E extends Enum<E>> E safeEnum(Class<E> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown enum value '{}' for {}", value, enumClass.getSimpleName());
            return null;
        }
    }
}
