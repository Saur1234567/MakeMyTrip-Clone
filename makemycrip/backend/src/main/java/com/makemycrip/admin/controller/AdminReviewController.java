package com.makemycrip.admin.controller;

import com.makemycrip.admin.service.AdminReviewService;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.hotel.entity.Review;
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
@RequestMapping("/api/v1/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Reviews")
public class AdminReviewController {

    private final AdminReviewService adminReviewService;

    @Operation(summary = "List all reviews")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<Map<String, Object>>>> listReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReviewService.listReviews(page, size, status, hotelId), "Reviews fetched"));
    }

    @Operation(summary = "Approve review")
    @PutMapping("/{reviewId}/approve")
    public ResponseEntity<ApiResponse<Review>> approveReview(
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReviewService.approveReview(reviewId, UUID.fromString(adminId)), "Review approved"));
    }

    @Operation(summary = "Reject review")
    @PutMapping("/{reviewId}/reject")
    public ResponseEntity<ApiResponse<Review>> rejectReview(
            @PathVariable UUID reviewId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.success(
                adminReviewService.rejectReview(reviewId, reason, UUID.fromString(adminId)), "Review rejected"));
    }

    @Operation(summary = "Flag review")
    @PutMapping("/{reviewId}/flag")
    public ResponseEntity<ApiResponse<Review>> flagReview(
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReviewService.flagReview(reviewId, UUID.fromString(adminId)), "Review flagged"));
    }

    @Operation(summary = "Edit review content")
    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<Review>> editReview(
            @PathVariable UUID reviewId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReviewService.editReview(reviewId, body, UUID.fromString(adminId)), "Review edited"));
    }

    @Operation(summary = "Add/update hotel response")
    @PutMapping("/{reviewId}/response")
    public ResponseEntity<ApiResponse<Review>> addHotelResponse(
            @PathVariable UUID reviewId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReviewService.addHotelResponse(reviewId, body.get("response"), UUID.fromString(adminId)),
                "Response added"));
    }

    @Operation(summary = "Delete review")
    @DeleteMapping("/{reviewId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal String adminId) {
        adminReviewService.deleteReview(reviewId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Review deleted"));
    }
}
