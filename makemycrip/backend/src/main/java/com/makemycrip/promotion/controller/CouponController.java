package com.makemycrip.promotion.controller;

import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.promotion.dto.CouponValidateRequest;
import com.makemycrip.promotion.dto.CouponValidateResponse;
import com.makemycrip.promotion.entity.CouponCode;
import com.makemycrip.promotion.entity.Promotion;
import com.makemycrip.promotion.repository.CouponCodeRepository;
import com.makemycrip.promotion.repository.PromotionRepository;
import com.makemycrip.promotion.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;
    private final PromotionRepository promotionRepository;
    private final CouponCodeRepository couponCodeRepository;

    /**
     * POST /api/v1/coupons/validate
     *
     * Validates a coupon code server-side and returns the server-computed discount.
     * The frontend MUST use the discountAmount from this response — never its own calculation.
     *
     * Body: { code, bookingRef, paymentMethod, hotelId?, city?, roomType?,
     *         selectedBank?, selectedWallet?, selectedUpiApp? }
     */
    @PostMapping("/validate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CouponValidateResponse>> validate(
            @Valid @RequestBody CouponValidateRequest request,
            @AuthenticationPrincipal String userId) {

        CouponValidateResponse result = couponService.validate(request, userId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /api/v1/coupons/available?bookingRef=MMC...
     *
     * Returns all coupons applicable to the given booking context (hotel, city, room type).
     * Used to populate the coupon suggestion list on the payment page.
     * Discount amounts are estimated using the booking's current total.
     */
    @GetMapping("/available")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<CouponValidateResponse>>> getAvailable(
            @RequestParam String bookingRef,
            @AuthenticationPrincipal String userId) {

        List<CouponValidateResponse> coupons = couponService.getAvailableCoupons(bookingRef, userId);
        return ResponseEntity.ok(ApiResponse.success(coupons));
    }

    /**
     * POST /api/v1/coupons/redeem
     *
     * Informational endpoint — coupon redemption happens atomically inside
     * POST /api/v1/payments/confirm. This endpoint documents the contract.
     *
     * Body: { bookingRef, couponCode }
     */
    @PostMapping("/redeem")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> redeem(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal String userId) {

        Map<String, String> info = new HashMap<>();
        info.put("message", "Coupon redemption is handled atomically by POST /api/v1/payments/confirm. "
                + "Pass couponCode in that request body.");
        return ResponseEntity.ok(ApiResponse.success(info));
    }

    /**
     * GET /api/v1/coupons/admin/all
     *
     * Admin-only: returns all promotions with their coupon codes.
     * Useful for the admin dashboard to view/manage coupons.
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> adminGetAll() {

        List<Promotion> promos = promotionRepository.findAll();

        List<Map<String, Object>> result = promos.stream().map(p -> {
            List<String> codes = couponCodeRepository
                    .findByPromotionIdOrderByCreatedAtDesc(p.getId())
                    .stream()
                    .map(CouponCode::getCode)
                    .collect(Collectors.toList());

            Map<String, Object> row = new HashMap<>();
            row.put("id",                       p.getId());
            row.put("promotionName",             p.getPromotionName());
            row.put("promotionType",             p.getPromotionType() != null ? p.getPromotionType() : "");
            row.put("discountType",              p.getDiscountType() != null ? p.getDiscountType() : "");
            row.put("discountValue",             p.getDiscountValue());
            row.put("maxDiscountAmount",         p.getMaxDiscountAmount());
            row.put("minBookingAmount",          p.getMinBookingAmount());
            row.put("scope",                     p.getScope() != null ? p.getScope() : "UNIVERSAL");
            row.put("city",                      p.getCity() != null ? p.getCity() : "");
            row.put("roomType",                  p.getRoomType() != null ? p.getRoomType() : "");
            row.put("isActive",                  p.getIsActive());
            row.put("validFrom",                 p.getValidFrom());
            row.put("validUntil",                p.getValidUntil());
            row.put("currentUsage",              p.getCurrentUsage());
            row.put("totalUsageLimit",           p.getTotalUsageLimit());
            row.put("perUserLimit",              p.getPerUserLimit());
            row.put("applicablePaymentMethods",  p.getApplicablePaymentMethods() != null ? p.getApplicablePaymentMethods() : "all");
            row.put("isStackable",               p.getIsStackable());
            row.put("codes",                     codes);
            return row;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
