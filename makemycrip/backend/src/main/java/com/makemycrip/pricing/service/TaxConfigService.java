package com.makemycrip.pricing.service;

import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.pricing.dto.TaxFeeRequest;
import com.makemycrip.pricing.dto.TaxSlabRequest;
import com.makemycrip.pricing.entity.TaxFee;
import com.makemycrip.pricing.entity.TaxSlab;
import com.makemycrip.pricing.repository.TaxFeeRepository;
import com.makemycrip.pricing.repository.TaxSlabRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaxConfigService {

    private final TaxSlabRepository taxSlabRepository;
    private final TaxFeeRepository taxFeeRepository;

    // ── Tax Slabs ─────────────────────────────────────────────────────────────

    public List<TaxSlab> getAllSlabs() {
        return taxSlabRepository.findAllByOrderByMinAmountAsc();
    }

    public List<TaxSlab> getActiveSlabs() {
        return taxSlabRepository.findByIsActiveTrueOrderByMinAmountAsc();
    }

    @Transactional
    public TaxSlab createSlab(TaxSlabRequest req) {
        TaxSlab slab = TaxSlab.builder()
                .minAmount(req.getMinAmount())
                .maxAmount(req.getMaxAmount())
                .gstRate(req.getGstRate())
                .label(req.getLabel())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();
        return taxSlabRepository.save(slab);
    }

    @Transactional
    public TaxSlab updateSlab(UUID id, TaxSlabRequest req) {
        TaxSlab slab = taxSlabRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax slab not found: " + id));
        if (req.getMinAmount() != null) slab.setMinAmount(req.getMinAmount());
        if (req.getMaxAmount() != null) slab.setMaxAmount(req.getMaxAmount());
        if (req.getGstRate() != null) slab.setGstRate(req.getGstRate());
        if (req.getLabel() != null) slab.setLabel(req.getLabel());
        if (req.getIsActive() != null) slab.setIsActive(req.getIsActive());
        return taxSlabRepository.save(slab);
    }

    @Transactional
    public void deleteSlab(UUID id) {
        if (!taxSlabRepository.existsById(id))
            throw new ResourceNotFoundException("Tax slab not found: " + id);
        taxSlabRepository.deleteById(id);
    }

    // ── Tax Fees ──────────────────────────────────────────────────────────────

    public List<TaxFee> getAllFees() {
        return taxFeeRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<TaxFee> getActiveFees() {
        return taxFeeRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
    }

    public List<TaxFee> getActiveFeesForHotel(UUID hotelId) {
        List<TaxFee> fees = taxFeeRepository.findByScopeAndIsActiveTrueOrderByDisplayOrderAsc("GLOBAL");
        if (hotelId != null) {
            fees.addAll(taxFeeRepository.findByHotelIdAndIsActiveTrueOrderByDisplayOrderAsc(hotelId));
        }
        return fees;
    }

    @Transactional
    public TaxFee createFee(TaxFeeRequest req) {
        TaxFee fee = TaxFee.builder()
                .feeName(req.getFeeName())
                .feeType(req.getFeeType())
                .amount(req.getAmount())
                .scope(req.getScope() != null ? req.getScope() : "GLOBAL")
                .hotelId(req.getHotelId())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .build();
        return taxFeeRepository.save(fee);
    }

    @Transactional
    public TaxFee updateFee(UUID id, TaxFeeRequest req) {
        TaxFee fee = taxFeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax fee not found: " + id));
        if (req.getFeeName() != null) fee.setFeeName(req.getFeeName());
        if (req.getFeeType() != null) fee.setFeeType(req.getFeeType());
        if (req.getAmount() != null) fee.setAmount(req.getAmount());
        if (req.getScope() != null) fee.setScope(req.getScope());
        if (req.getHotelId() != null) fee.setHotelId(req.getHotelId());
        if (req.getIsActive() != null) fee.setIsActive(req.getIsActive());
        if (req.getDisplayOrder() != null) fee.setDisplayOrder(req.getDisplayOrder());
        return taxFeeRepository.save(fee);
    }

    @Transactional
    public void deleteFee(UUID id) {
        if (!taxFeeRepository.existsById(id))
            throw new ResourceNotFoundException("Tax fee not found: " + id);
        taxFeeRepository.deleteById(id);
    }

    // ── Pricing helpers ───────────────────────────────────────────────────────

    /**
     * Returns the GST rate (0–100) applicable to the given booking total.
     * Uses the active slab with the highest minAmount that is ≤ bookingTotal.
     */
    public BigDecimal resolveGstRate(BigDecimal bookingTotal) {
        List<TaxSlab> slabs = getActiveSlabs();
        BigDecimal rate = BigDecimal.ZERO;
        for (TaxSlab slab : slabs) {
            if (bookingTotal.compareTo(slab.getMinAmount()) >= 0) {
                if (slab.getMaxAmount() == null || bookingTotal.compareTo(slab.getMaxAmount()) < 0) {
                    return slab.getGstRate();
                }
                rate = slab.getGstRate(); // keep updating — last matching slab wins
            }
        }
        return rate;
    }

    /**
     * Computes total flat fees for a booking at a given hotel.
     * PERCENT fees are applied against the booking subtotal.
     */
    public BigDecimal computeTotalFees(BigDecimal subtotal, UUID hotelId) {
        List<TaxFee> fees = getActiveFeesForHotel(hotelId);
        BigDecimal total = BigDecimal.ZERO;
        for (TaxFee fee : fees) {
            if ("FLAT".equalsIgnoreCase(fee.getFeeType())) {
                total = total.add(fee.getAmount());
            } else if ("PERCENT".equalsIgnoreCase(fee.getFeeType())) {
                total = total.add(subtotal.multiply(fee.getAmount())
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP));
            }
        }
        return total;
    }
}
