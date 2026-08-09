package com.makemycrip.pricing.controller;

import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.pricing.dto.TaxFeeRequest;
import com.makemycrip.pricing.dto.TaxSlabRequest;
import com.makemycrip.pricing.entity.TaxFee;
import com.makemycrip.pricing.entity.TaxSlab;
import com.makemycrip.pricing.service.TaxConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/tax-config")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Tax Config", description = "Manage GST slabs and tax/fee configuration")
public class TaxConfigController {

    private final TaxConfigService taxConfigService;

    // ── Tax Slabs ─────────────────────────────────────────────────────────────

    @Operation(summary = "List all tax slabs")
    @GetMapping("/slabs")
    public ResponseEntity<ApiResponse<List<TaxSlab>>> listSlabs() {
        return ResponseEntity.ok(ApiResponse.success(taxConfigService.getAllSlabs()));
    }

    @Operation(summary = "Create a new tax slab")
    @PostMapping("/slabs")
    public ResponseEntity<ApiResponse<TaxSlab>> createSlab(@RequestBody TaxSlabRequest req) {
        return ResponseEntity.ok(ApiResponse.success(taxConfigService.createSlab(req), "Tax slab created"));
    }

    @Operation(summary = "Update a tax slab")
    @PutMapping("/slabs/{id}")
    public ResponseEntity<ApiResponse<TaxSlab>> updateSlab(
            @PathVariable UUID id, @RequestBody TaxSlabRequest req) {
        return ResponseEntity.ok(ApiResponse.success(taxConfigService.updateSlab(id, req), "Tax slab updated"));
    }

    @Operation(summary = "Delete a tax slab")
    @DeleteMapping("/slabs/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSlab(@PathVariable UUID id) {
        taxConfigService.deleteSlab(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Tax slab deleted"));
    }

    // ── Tax Fees ──────────────────────────────────────────────────────────────

    @Operation(summary = "List all tax fees")
    @GetMapping("/fees")
    public ResponseEntity<ApiResponse<List<TaxFee>>> listFees() {
        return ResponseEntity.ok(ApiResponse.success(taxConfigService.getAllFees()));
    }

    @Operation(summary = "Create a new tax fee")
    @PostMapping("/fees")
    public ResponseEntity<ApiResponse<TaxFee>> createFee(@RequestBody TaxFeeRequest req) {
        return ResponseEntity.ok(ApiResponse.success(taxConfigService.createFee(req), "Tax fee created"));
    }

    @Operation(summary = "Update a tax fee")
    @PutMapping("/fees/{id}")
    public ResponseEntity<ApiResponse<TaxFee>> updateFee(
            @PathVariable UUID id, @RequestBody TaxFeeRequest req) {
        return ResponseEntity.ok(ApiResponse.success(taxConfigService.updateFee(id, req), "Tax fee updated"));
    }

    @Operation(summary = "Delete a tax fee")
    @DeleteMapping("/fees/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFee(@PathVariable UUID id) {
        taxConfigService.deleteFee(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Tax fee deleted"));
    }
}
