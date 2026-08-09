package com.makemycrip.admin.controller;

import com.makemycrip.admin.dto.PricingRuleRequest;
import com.makemycrip.admin.dto.PromotionRequest;
import com.makemycrip.admin.service.AdminPromotionService;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.pricing.entity.PricingRule;
import com.makemycrip.promotion.entity.CouponCode;
import com.makemycrip.promotion.entity.Promotion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Promotions & Pricing Rules")
public class AdminPromotionController {

    private final AdminPromotionService adminPromotionService;

    // ── Promotions ───────────────────────────────────────────────────────────────

    @Operation(summary = "List all promotions")
    @GetMapping("/promotions")
    public ResponseEntity<ApiResponse<Page<Promotion>>> listPromotions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.listPromotions(page, size), "Promotions fetched"));
    }

    @Operation(summary = "Create promotion")
    @PostMapping("/promotions")
    public ResponseEntity<ApiResponse<Promotion>> createPromotion(
            @RequestBody PromotionRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminPromotionService.createPromotion(request, UUID.fromString(adminId)),
                "Promotion created", HttpStatus.CREATED));
    }

    @Operation(summary = "Update promotion")
    @PutMapping("/promotions/{promoId}")
    public ResponseEntity<ApiResponse<Promotion>> updatePromotion(
            @PathVariable UUID promoId,
            @RequestBody PromotionRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.updatePromotion(promoId, request, UUID.fromString(adminId)),
                "Promotion updated"));
    }

    @Operation(summary = "Delete promotion")
    @DeleteMapping("/promotions/{promoId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(
            @PathVariable UUID promoId,
            @AuthenticationPrincipal String adminId) {
        adminPromotionService.deletePromotion(promoId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Promotion deleted"));
    }

    @Operation(summary = "Toggle promotion active status")
    @PutMapping("/promotions/{promoId}/toggle-active")
    public ResponseEntity<ApiResponse<Promotion>> togglePromotion(
            @PathVariable UUID promoId,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.toggleActive(promoId, UUID.fromString(adminId)),
                "Promotion toggled"));
    }

    // ── Coupons ──────────────────────────────────────────────────────────────────

    @Operation(summary = "List coupons for promotion")
    @GetMapping("/promotions/{promoId}/coupons")
    public ResponseEntity<ApiResponse<List<CouponCode>>> listCoupons(@PathVariable UUID promoId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.listCoupons(promoId), "Coupons fetched"));
    }

    @Operation(summary = "Generate coupon codes")
    @PostMapping("/promotions/{promoId}/coupons/generate")
    public ResponseEntity<ApiResponse<List<CouponCode>>> generateCoupons(
            @PathVariable UUID promoId,
            @RequestBody Map<String, Integer> body,
            @AuthenticationPrincipal String adminId) {
        int count = body.getOrDefault("count", 10);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminPromotionService.generateCoupons(promoId, count, UUID.fromString(adminId)),
                "Coupons generated", HttpStatus.CREATED));
    }

    @Operation(summary = "Delete coupon")
    @DeleteMapping("/coupons/{couponId}")
    public ResponseEntity<ApiResponse<Void>> deleteCoupon(
            @PathVariable UUID couponId,
            @AuthenticationPrincipal String adminId) {
        adminPromotionService.deleteCoupon(couponId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Coupon deleted"));
    }

    // ── Pricing Rules ────────────────────────────────────────────────────────────

    @Operation(summary = "List pricing rules for hotel")
    @GetMapping("/hotels/{hotelId}/pricing-rules")
    public ResponseEntity<ApiResponse<List<PricingRule>>> listPricingRules(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.listAllPricingRules(hotelId), "Pricing rules fetched"));
    }

    @Operation(summary = "Create pricing rule")
    @PostMapping("/hotels/{hotelId}/pricing-rules")
    public ResponseEntity<ApiResponse<PricingRule>> createPricingRule(
            @PathVariable UUID hotelId,
            @RequestBody PricingRuleRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminPromotionService.createPricingRule(hotelId, request, UUID.fromString(adminId)),
                "Pricing rule created", HttpStatus.CREATED));
    }

    @Operation(summary = "Update pricing rule")
    @PutMapping("/pricing-rules/{ruleId}")
    public ResponseEntity<ApiResponse<PricingRule>> updatePricingRule(
            @PathVariable UUID ruleId,
            @RequestBody PricingRuleRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.updatePricingRule(ruleId, request, UUID.fromString(adminId)),
                "Pricing rule updated"));
    }

    @Operation(summary = "Delete pricing rule")
    @DeleteMapping("/pricing-rules/{ruleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePricingRule(
            @PathVariable UUID ruleId,
            @AuthenticationPrincipal String adminId) {
        adminPromotionService.deletePricingRule(ruleId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Pricing rule deleted"));
    }

    @Operation(summary = "Toggle pricing rule active")
    @PutMapping("/pricing-rules/{ruleId}/toggle-active")
    public ResponseEntity<ApiResponse<PricingRule>> togglePricingRule(
            @PathVariable UUID ruleId,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPromotionService.togglePricingRule(ruleId, UUID.fromString(adminId)),
                "Pricing rule toggled"));
    }
}
