package com.makemycrip.admin.controller;

import com.makemycrip.admin.dto.DashboardStatsDto;
import com.makemycrip.admin.service.AdminDashboardService;
import com.makemycrip.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Dashboard", description = "Admin dashboard stats and analytics")
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    @Operation(summary = "Get dashboard KPI stats")
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDto>> getStats() {
        DashboardStatsDto stats = dashboardService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats, "Dashboard stats fetched"));
    }
}
