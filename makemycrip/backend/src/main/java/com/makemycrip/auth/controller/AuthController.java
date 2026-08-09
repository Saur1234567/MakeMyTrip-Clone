package com.makemycrip.auth.controller;

import com.makemycrip.auth.dto.*;
import com.makemycrip.auth.service.AuthService;
import com.makemycrip.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Auth endpoints: register, login, OTP, sessions")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register new user")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(null, "Registration successful. Please verify your email.", HttpStatus.CREATED));
    }

    @Operation(summary = "Verify email with OTP — returns auth tokens so the user is logged in immediately")
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @Valid @RequestBody OtpVerifyRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.verifyEmail(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Email verified successfully"));
    }

    @Operation(summary = "Login with email and password")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @Operation(summary = "Refresh access token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.refreshToken(request.getRefreshToken(), httpRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
    }

    @Operation(summary = "Logout from current session")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            authService.logout(userId, sessionId);
        } else {
            // No sessionId provided — log out all sessions (safe fallback)
            authService.logoutAll(userId);
        }
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }

    @Operation(summary = "Logout from all sessions")
    @PostMapping("/logout-all")
    public ResponseEntity<ApiResponse<Void>> logoutAll(
            @AuthenticationPrincipal String userId) {
        authService.logoutAll(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "All sessions terminated"));
    }

    @Operation(summary = "Request password reset OTP")
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset OTP sent to your email"));
    }

    @Operation(summary = "Reset password with OTP")
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully"));
    }

    @Operation(summary = "Change password (authenticated)")
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password changed successfully"));
    }

    @Operation(summary = "Get active sessions")
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<SessionDto>>> getSessions(
            @AuthenticationPrincipal String userId) {
        List<SessionDto> sessions = authService.getActiveSessions(userId);
        return ResponseEntity.ok(ApiResponse.success(sessions, "Sessions retrieved"));
    }

    @Operation(summary = "Revoke a specific session")
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID sessionId) {
        authService.revokeSession(userId, sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Session revoked"));
    }
}
