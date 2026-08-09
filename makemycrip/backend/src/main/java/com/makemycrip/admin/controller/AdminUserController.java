package com.makemycrip.admin.controller;

import com.makemycrip.admin.service.AdminUserService;
import com.makemycrip.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Users", description = "User management for admins")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @Operation(summary = "List all users")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<Map<String, Object>>>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.listUsers(page, size, search, role), "Users fetched"));
    }

    @Operation(summary = "Get user by ID")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUser(userId), "User fetched"));
    }

    @Operation(summary = "Update user profile")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.updateUser(userId, request, UUID.fromString(adminId)), "User updated"));
    }

    @Operation(summary = "Ban user")
    @PutMapping("/{userId}/ban")
    public ResponseEntity<ApiResponse<Void>> banUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        adminUserService.banUser(userId, body.get("reason"), UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "User banned"));
    }

    @Operation(summary = "Unban user")
    @PutMapping("/{userId}/unban")
    public ResponseEntity<ApiResponse<Void>> unbanUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal String adminId) {
        adminUserService.unbanUser(userId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "User unbanned"));
    }

    @Operation(summary = "Change user role")
    @PutMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<Void>> changeRole(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        adminUserService.changeRole(userId, body.get("role"), UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Role updated"));
    }

    @Operation(summary = "Set loyalty tier")
    @PutMapping("/{userId}/loyalty-tier")
    public ResponseEntity<ApiResponse<Void>> setLoyaltyTier(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        adminUserService.setLoyaltyTier(userId, body.get("tier"), UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Loyalty tier updated"));
    }

    @Operation(summary = "Adjust loyalty points")
    @PutMapping("/{userId}/loyalty-points")
    public ResponseEntity<ApiResponse<Void>> adjustLoyaltyPoints(
            @PathVariable UUID userId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String adminId) {
        int points = ((Number) body.get("points")).intValue();
        String reason = (String) body.get("reason");
        adminUserService.adjustLoyaltyPoints(userId, points, reason, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Loyalty points adjusted"));
    }

    @Operation(summary = "Verify user email")
    @PutMapping("/{userId}/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @PathVariable UUID userId,
            @AuthenticationPrincipal String adminId) {
        adminUserService.verifyEmail(userId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Email verified"));
    }

    @Operation(summary = "Verify user phone")
    @PutMapping("/{userId}/verify-phone")
    public ResponseEntity<ApiResponse<Void>> verifyPhone(
            @PathVariable UUID userId,
            @AuthenticationPrincipal String adminId) {
        adminUserService.verifyPhone(userId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Phone verified"));
    }

    @Operation(summary = "Terminate all user sessions")
    @DeleteMapping("/{userId}/sessions")
    public ResponseEntity<ApiResponse<Void>> terminateAllSessions(
            @PathVariable UUID userId,
            @AuthenticationPrincipal String adminId) {
        adminUserService.terminateAllSessions(userId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "All sessions terminated"));
    }

    @Operation(summary = "Get user bookings")
    @GetMapping("/{userId}/bookings")
    public ResponseEntity<ApiResponse<Page<Object>>> getUserBookings(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.getUserBookings(userId, page, size), "Bookings fetched"));
    }

    @Operation(summary = "Get user reviews")
    @GetMapping("/{userId}/reviews")
    public ResponseEntity<ApiResponse<java.util.List<Map<String, Object>>>> getUserReviews(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.getUserReviews(userId), "Reviews fetched"));
    }

    @Operation(summary = "Soft delete user")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal String adminId) {
        adminUserService.deleteUser(userId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "User deleted"));
    }
}
