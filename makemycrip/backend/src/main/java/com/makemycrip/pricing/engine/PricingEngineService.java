package com.makemycrip.pricing.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.common.util.DateUtil;
import com.makemycrip.hotel.entity.RoomInventory;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.repository.RoomInventoryRepository;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import com.makemycrip.pricing.dto.PricingContext;
import com.makemycrip.pricing.dto.PricingResult;
import com.makemycrip.pricing.entity.PricingAuditLog;
import com.makemycrip.pricing.entity.TaxFee;
import com.makemycrip.pricing.repository.PricingAuditLogRepository;
import com.makemycrip.pricing.service.TaxConfigService;
import com.makemycrip.user.enums.DeviceType;
import com.makemycrip.user.enums.LoyaltyTier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PricingEngineService {

    private static final BigDecimal BD_100 = new BigDecimal("100");

    private final RoomTypeRepository roomTypeRepository;
    private final RoomInventoryRepository inventoryRepository;
    private final PricingAuditLogRepository auditLogRepository;
    private final TaxConfigService taxConfigService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PricingResult calculatePrice(PricingContext ctx) {
        RoomType roomType = roomTypeRepository.findById(ctx.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));

        int nights = (int) DateUtil.daysBetween(ctx.getCheckIn(), ctx.getCheckOut());
        if (nights <= 0) throw new IllegalArgumentException("Check-out must be after check-in");

        List<RoomInventory> inventoryList = inventoryRepository
                .findByRoomTypeIdAndDateBetweenOrderByDateAsc(ctx.getRoomTypeId(),
                        ctx.getCheckIn(), ctx.getCheckOut().minusDays(1));

        BigDecimal basePrice = computeBasePrice(roomType, inventoryList);
        List<PricingResult.PriceAdjustment> adjustments = new ArrayList<>();
        List<PricingResult.TaxLine> taxLines = new ArrayList<>();

        BigDecimal workingPrice = basePrice;

        // Rule 1: Admin override
        if (!inventoryList.isEmpty() && inventoryList.get(0).getAdminOverridePrice() != null) {
            workingPrice = inventoryList.get(0).getAdminOverridePrice();
        }

        // Rule 2: Price floor / ceiling enforcement
        if (!inventoryList.isEmpty()) {
            BigDecimal floor = inventoryList.get(0).getMinPriceFloor();
            BigDecimal ceiling = inventoryList.get(0).getMaxPriceCeiling();
            if (floor != null && workingPrice.compareTo(floor) < 0) workingPrice = floor;
            if (ceiling != null && workingPrice.compareTo(ceiling) > 0) workingPrice = ceiling;
        }

        // Rule 4: Occupancy surge pricing
        if (!inventoryList.isEmpty()) {
            double occupancy = inventoryList.get(0).getOccupancyPercent();
            BigDecimal surcharge = BigDecimal.ZERO;
            String label = null;
            if (occupancy >= 90) { surcharge = pct(workingPrice, 30); label = "High demand surcharge (+30%)"; }
            else if (occupancy >= 75) { surcharge = pct(workingPrice, 20); label = "High demand surcharge (+20%)"; }
            else if (occupancy >= 60) { surcharge = pct(workingPrice, 10); label = "High demand surcharge (+10%)"; }
            else if (occupancy < 20) { surcharge = pct(workingPrice, -15); label = "Low occupancy discount (-15%)"; }
            if (label != null) {
                adjustments.add(PricingResult.PriceAdjustment.builder()
                        .name(label)
                        .type(surcharge.compareTo(BigDecimal.ZERO) >= 0 ? "SURCHARGE" : "DISCOUNT")
                        .amount(surcharge.abs())
                        .ruleType("OCCUPANCY")
                        .build());
                workingPrice = workingPrice.add(surcharge);
            }
        }

        // Rule 5: Weekend surcharge
        long weekendNights = countWeekendNights(ctx.getCheckIn(), ctx.getCheckOut());
        if (weekendNights > 0 && nights > 0) {
            BigDecimal weekendSurcharge = pct(workingPrice, 15)
                    .multiply(BigDecimal.valueOf(weekendNights))
                    .divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP);
            adjustments.add(PricingResult.PriceAdjustment.builder()
                    .name("Weekend surcharge (+15%)")
                    .type("SURCHARGE")
                    .amount(weekendSurcharge)
                    .ruleType("WEEKEND")
                    .build());
            workingPrice = workingPrice.add(weekendSurcharge.divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP));
        }

        // Rule 6: Advance booking discount
        int advanceDays = DateUtil.advanceBookingDays(ctx.getCheckIn());
        if (advanceDays >= 60) {
            BigDecimal d = pct(workingPrice, -15);
            adjustments.add(adj("Early bird discount 60+ days (-15%)", "DISCOUNT", d.abs(), "EARLY_BIRD"));
            workingPrice = workingPrice.add(d);
        } else if (advanceDays >= 30) {
            BigDecimal d = pct(workingPrice, -8);
            adjustments.add(adj("Early bird discount 30-60 days (-8%)", "DISCOUNT", d.abs(), "EARLY_BIRD"));
            workingPrice = workingPrice.add(d);
        } else if (advanceDays <= 7) {
            BigDecimal s = pct(workingPrice, 10);
            adjustments.add(adj("Last minute surcharge (+10%)", "SURCHARGE", s, "LAST_MINUTE"));
            workingPrice = workingPrice.add(s);
        }

        // Rule 7: Loyalty discount
        if (ctx.getLoyaltyTier() != null) {
            BigDecimal loyaltyDiscount = getLoyaltyDiscount(workingPrice, ctx.getLoyaltyTier());
            if (loyaltyDiscount.compareTo(BigDecimal.ZERO) > 0) {
                String tierName = ctx.getLoyaltyTier().name();
                adjustments.add(adj(tierName + " member discount", "DISCOUNT", loyaltyDiscount, "LOYALTY"));
                workingPrice = workingPrice.subtract(loyaltyDiscount);
            }
        }

        // Rule 8: Device discount
        if (DeviceType.MOBILE.equals(ctx.getDeviceType())) {
            BigDecimal mobileDiscount = pct(workingPrice, -5).abs();
            adjustments.add(adj("Mobile booking discount (-5%)", "DISCOUNT", mobileDiscount, "DEVICE"));
            workingPrice = workingPrice.subtract(mobileDiscount);
        }

        // Rule 9: Length of stay discount
        if (nights >= 7) {
            BigDecimal d = pct(workingPrice, -10).abs();
            adjustments.add(adj("7+ nights discount (-10%)", "DISCOUNT", d, "LOS"));
            workingPrice = workingPrice.subtract(d);
        } else if (nights >= 3) {
            BigDecimal d = pct(workingPrice, -5).abs();
            adjustments.add(adj("3+ nights discount (-5%)", "DISCOUNT", d, "LOS"));
            workingPrice = workingPrice.subtract(d);
        }

        // Ensure price floor
        workingPrice = workingPrice.max(new BigDecimal("500"));

        BigDecimal pricePerNight = workingPrice.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalForStay = pricePerNight.multiply(BigDecimal.valueOf(nights)).setScale(2, RoundingMode.HALF_UP);

        // ── DB-driven GST calculation ─────────────────────────────────────────
        BigDecimal gstRate = taxConfigService.resolveGstRate(pricePerNight);
        if (gstRate.compareTo(BigDecimal.ZERO) > 0) {
            // Split into CGST + SGST (equal halves)
            BigDecimal halfRate = gstRate.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            BigDecimal cgstPerNight = pct(pricePerNight, halfRate.intValue());
            BigDecimal sgstPerNight = pct(pricePerNight, halfRate.intValue());
            BigDecimal cgstTotal = cgstPerNight.multiply(BigDecimal.valueOf(nights)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal sgstTotal = sgstPerNight.multiply(BigDecimal.valueOf(nights)).setScale(2, RoundingMode.HALF_UP);
            taxLines.add(PricingResult.TaxLine.builder().name("CGST").rate(halfRate).amount(cgstTotal).build());
            taxLines.add(PricingResult.TaxLine.builder().name("SGST").rate(halfRate).amount(sgstTotal).build());
        }

        BigDecimal totalTax = taxLines.stream().map(PricingResult.TaxLine::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        // ── DB-driven fees (global + hotel-specific) ──────────────────────────
        List<TaxFee> activeFees = taxConfigService.getActiveFeesForHotel(ctx.getHotelId());
        BigDecimal totalFees = BigDecimal.ZERO;
        for (TaxFee fee : activeFees) {
            BigDecimal feeAmount;
            if ("FLAT".equalsIgnoreCase(fee.getFeeType())) {
                feeAmount = fee.getAmount();
            } else {
                feeAmount = totalForStay.multiply(fee.getAmount())
                        .divide(BD_100, 2, RoundingMode.HALF_UP);
            }
            taxLines.add(PricingResult.TaxLine.builder()
                    .name(fee.getFeeName())
                    .rate("PERCENT".equalsIgnoreCase(fee.getFeeType()) ? fee.getAmount() : BigDecimal.ZERO)
                    .amount(feeAmount)
                    .build());
            totalFees = totalFees.add(feeAmount);
        }

        // Convenience fee = first FLAT GLOBAL fee (for backward compat with Booking entity field)
        BigDecimal convenienceFee = activeFees.stream()
                .filter(f -> "FLAT".equalsIgnoreCase(f.getFeeType()) && "GLOBAL".equalsIgnoreCase(f.getScope()))
                .findFirst()
                .map(TaxFee::getAmount)
                .orElse(BigDecimal.ZERO);

        BigDecimal grandTotal = totalForStay.add(totalTax).add(totalFees).setScale(2, RoundingMode.HALF_UP);

        PricingResult result = PricingResult.builder()
                .basePrice(basePrice)
                .pricePerNight(pricePerNight)
                .totalForStay(totalForStay)
                .adjustments(adjustments)
                .subtotalAfterAdjustments(totalForStay)
                .taxBreakdown(taxLines)
                .totalTax(totalTax.add(totalFees))
                .convenienceFee(convenienceFee)
                .grandTotal(grandTotal)
                .priceLockedUntil(LocalDateTime.now().plusMinutes(15))
                .nights(nights)
                .build();

        logPricingAudit(ctx, basePrice, result, adjustments);
        return result;
    }

    private BigDecimal computeBasePrice(RoomType roomType, List<RoomInventory> inventoryList) {
        if (inventoryList.isEmpty()) return roomType.getBasePrice();
        return inventoryList.stream()
                .map(RoomInventory::getBasePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(inventoryList.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal getLoyaltyDiscount(BigDecimal price, LoyaltyTier tier) {
        return switch (tier) {
            case SILVER -> pct(price, -3).abs();
            case GOLD -> pct(price, -7).abs();
            case PLATINUM -> pct(price, -12).abs();
            default -> BigDecimal.ZERO;
        };
    }

    private long countWeekendNights(LocalDate checkIn, LocalDate checkOut) {
        return checkIn.datesUntil(checkOut).filter(DateUtil::isWeekend).count();
    }

    private BigDecimal pct(BigDecimal value, int percent) {
        return value.multiply(BigDecimal.valueOf(percent))
                .divide(BD_100, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal pct(BigDecimal value, BigDecimal percent) {
        return value.multiply(percent)
                .divide(BD_100, 2, RoundingMode.HALF_UP);
    }

    private PricingResult.PriceAdjustment adj(String name, String type, BigDecimal amount, String ruleType) {
        return PricingResult.PriceAdjustment.builder()
                .name(name).type(type).amount(amount).ruleType(ruleType).build();
    }

    private void logPricingAudit(PricingContext ctx, BigDecimal basePrice,
                                  PricingResult result, List<PricingResult.PriceAdjustment> adjustments) {
        try {
            String rulesJson = objectMapper.writeValueAsString(adjustments);
            PricingAuditLog auditLog = PricingAuditLog.builder()
                    .sessionId(ctx.getSessionId())
                    .userId(ctx.getUserId())
                    .roomTypeId(ctx.getRoomTypeId())
                    .checkIn(ctx.getCheckIn())
                    .checkOut(ctx.getCheckOut())
                    .basePrice(basePrice)
                    .rulesApplied(rulesJson)
                    .finalPrice(result.getGrandTotal())
                    .deviceType(ctx.getDeviceType() != null ? ctx.getDeviceType().name() : null)
                    .ipAddress(ctx.getIpAddress())
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to save pricing audit: {}", e.getMessage());
        }
    }
}
