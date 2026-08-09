package com.makemycrip.hotel.controller;

import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.hotel.dto.*;
import com.makemycrip.hotel.service.HotelService;
import com.makemycrip.hotel.service.ReviewService;
import com.makemycrip.hotel.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hotels")
@RequiredArgsConstructor
@Tag(name = "Hotels", description = "Hotel search, detail, reviews, wishlist")
public class HotelController {

    private final HotelService hotelService;
    private final ReviewService reviewService;
    private final WishlistService wishlistService;

    @Operation(summary = "Search hotels")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<HotelSummaryDto>>> search(
            @Valid HotelSearchRequest request,
            @AuthenticationPrincipal String userId) {
        Page<HotelSummaryDto> results = hotelService.search(request, userId);
        return ResponseEntity.ok(ApiResponse.success(results, "Hotels fetched successfully"));
    }

    @Operation(summary = "Get hotel detail by slug")
    @GetMapping("/{city}/{slug}")
    public ResponseEntity<ApiResponse<HotelDetailDto>> getBySlug(
            @PathVariable String city,
            @PathVariable String slug,
            @AuthenticationPrincipal String userId) {
        HotelDetailDto hotel = hotelService.getBySlug(slug, userId);
        return ResponseEntity.ok(ApiResponse.success(hotel, "Hotel fetched successfully"));
    }

    @Operation(summary = "Get hotel by ID")
    @GetMapping("/{hotelId}")
    public ResponseEntity<ApiResponse<HotelDetailDto>> getById(
            @PathVariable UUID hotelId,
            @AuthenticationPrincipal String userId) {
        HotelDetailDto hotel = hotelService.getById(hotelId, userId);
        return ResponseEntity.ok(ApiResponse.success(hotel, "Hotel fetched successfully"));
    }

    /**
     * Get available room types for a specific hotel.
     * Uses RoomAvailabilityRequest (no city required, no @Future on checkIn)
     * so that same-day check-in and hotel-detail-page queries work correctly.
     */
    @Operation(summary = "Get available room types for a hotel")
    @GetMapping("/{hotelId}/rooms")
    public ResponseEntity<ApiResponse<List<RoomTypeDto>>> getAvailableRooms(
            @PathVariable UUID hotelId,
            @Valid RoomAvailabilityRequest request,
            @AuthenticationPrincipal String userId) {
        List<RoomTypeDto> rooms = hotelService.getAvailableRooms(hotelId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(rooms, "Rooms fetched successfully"));
    }

    @Operation(summary = "Get hotel reviews")
    @GetMapping("/{hotelId}/reviews")
    public ResponseEntity<ApiResponse<Page<ReviewDto>>> getReviews(
            @PathVariable UUID hotelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ReviewDto> reviews = reviewService.getHotelReviews(hotelId, page, size);
        return ResponseEntity.ok(ApiResponse.success(reviews, "Reviews fetched successfully"));
    }

    @Operation(summary = "Submit hotel review")
    @PostMapping("/{hotelId}/reviews")
    public ResponseEntity<ApiResponse<ReviewDto>> submitReview(
            @PathVariable UUID hotelId,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal String userId) {
        ReviewDto review = reviewService.submitReview(hotelId, UUID.fromString(userId), request);
        return ResponseEntity.ok(ApiResponse.success(review, "Review submitted successfully"));
    }

    @Operation(summary = "Toggle wishlist for hotel")
    @PostMapping("/{hotelId}/wishlist")
    public ResponseEntity<ApiResponse<Boolean>> toggleWishlist(
            @PathVariable UUID hotelId,
            @AuthenticationPrincipal String userId) {
        boolean added = wishlistService.toggle(UUID.fromString(userId), hotelId);
        return ResponseEntity.ok(ApiResponse.success(added, added ? "Added to wishlist" : "Removed from wishlist"));
    }
}
