package com.makemycrip.user.controller;

import com.makemycrip.auth.dto.ChangePasswordRequest;
import com.makemycrip.auth.service.AuthService;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.hotel.dto.HotelSummaryDto;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.ReviewRepository;
import com.makemycrip.hotel.entity.Review;
import com.makemycrip.user.dto.UpdateProfileRequest;
import com.makemycrip.user.dto.UserProfileDto;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import com.makemycrip.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final HotelRepository hotelRepository;
    private final AuthService authService;

    @GetMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(
            @AuthenticationPrincipal String userId) {
        User user = resolveUser(userId);
        return ResponseEntity.ok(ApiResponse.success(userService.getProfile(user.getId())));
    }

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfile(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        User user = resolveUser(userId);
        return ResponseEntity.ok(ApiResponse.success(userService.updateProfile(user.getId(), request)));
    }

    @PostMapping("/profile/picture")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadProfilePicture(
            @AuthenticationPrincipal String userId,
            @RequestBody java.util.Map<String, String> body) {
        String dataUrl = body.get("imageDataUrl");
        if (dataUrl == null || dataUrl.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(org.springframework.http.HttpStatus.BAD_REQUEST,
                            "imageDataUrl is required", "/api/v1/users/profile/picture"));
        }
        User user = resolveUser(userId);
        return ResponseEntity.ok(ApiResponse.success(userService.updateProfilePicture(user.getId(), dataUrl)));
    }

    @GetMapping("/wishlist")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<HotelSummaryDto>>> getWishlist(
            @AuthenticationPrincipal String userId) {
        User user = resolveUser(userId);
        return ResponseEntity.ok(ApiResponse.success(userService.getWishlist(user.getId())));
    }

    @GetMapping("/reviews")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyReviews(
            @AuthenticationPrincipal String userId) {
        User user = resolveUser(userId);
        List<Review> reviews = reviewRepository.findByUserId(user.getId());

        // Enrich each review with hotelName and hotelCity from the Hotel table
        List<Map<String, Object>> enriched = reviews.stream().map(r -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", r.getId());
            dto.put("bookingId", r.getBookingId());
            dto.put("hotelId", r.getHotelId());
            dto.put("overallRating", r.getOverallRating());
            dto.put("cleanlinessRating", r.getCleanlinessRating());
            dto.put("serviceRating", r.getServiceRating());
            dto.put("locationRating", r.getLocationRating());
            dto.put("valueRating", r.getValueRating());
            dto.put("title", r.getTitle());
            dto.put("reviewText", r.getReviewText());
            dto.put("travelType", r.getTravelType() != null ? r.getTravelType().name() : null);
            dto.put("status", r.getStatus() != null ? r.getStatus().name() : null);
            dto.put("adminResponse", r.getAdminResponse());
            dto.put("helpfulCount", r.getHelpfulCount());
            dto.put("createdAt", r.getCreatedAt());
            // Enrich with hotel info
            if (r.getHotelId() != null) {
                hotelRepository.findById(r.getHotelId()).ifPresent(h -> {
                    dto.put("hotelName", h.getName());
                    dto.put("hotelCity", h.getCity());
                    dto.put("hotelSlug", h.getSlug());
                });
            }
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(enriched));
    }

    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<?>>> getActiveSessions(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(ApiResponse.success(authService.getActiveSessions(userId)));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID sessionId) {
        authService.revokeSession(userId, sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Session revoked"));
    }

    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> logoutAll(
            @AuthenticationPrincipal String userId) {
        authService.logoutAll(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "All sessions terminated"));
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password changed successfully"));
    }

    @GetMapping("/loyalty/transactions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLoyaltyTransactions(
            @AuthenticationPrincipal String userId) {
        User user = resolveUser(userId);
        Map<String, Object> data = Map.of(
                "currentPoints", user.getLoyaltyPoints(),
                "tier", user.getLoyaltyTier().name(),
                "transactions", List.of()
        );
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    private User resolveUser(String userId) {
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
