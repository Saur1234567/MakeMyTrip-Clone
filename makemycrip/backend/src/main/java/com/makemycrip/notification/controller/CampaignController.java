package com.makemycrip.notification.controller;

import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.notification.dto.CampaignDto;
import com.makemycrip.notification.dto.CampaignRequest;
import com.makemycrip.notification.service.CampaignService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/campaigns")
@RequiredArgsConstructor
@Tag(name = "Admin Campaigns", description = "Promotional campaign management")
public class CampaignController {

    private final CampaignService campaignService;

    @Operation(summary = "Create a campaign")
    @PostMapping
    public ResponseEntity<ApiResponse<CampaignDto>> create(
            @AuthenticationPrincipal String adminId,
            @RequestBody CampaignRequest req) {
        CampaignDto dto = campaignService.createCampaign(req, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(dto, "Campaign created"));
    }

    @Operation(summary = "List all campaigns")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CampaignDto>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(campaignService.getCampaigns(page, size), "OK"));
    }

    @Operation(summary = "Get campaign by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CampaignDto>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(campaignService.getCampaign(id), "OK"));
    }

    @Operation(summary = "Send / trigger a campaign immediately")
    @PostMapping("/{id}/send")
    public ResponseEntity<ApiResponse<CampaignDto>> send(
            @AuthenticationPrincipal String adminId,
            @PathVariable UUID id) {
        CampaignDto dto = campaignService.sendCampaign(id, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(dto, "Campaign sent to " + dto.getTotalSent() + " users"));
    }

    @Operation(summary = "Cancel a scheduled campaign")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable UUID id) {
        campaignService.cancelCampaign(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Campaign cancelled"));
    }
}
