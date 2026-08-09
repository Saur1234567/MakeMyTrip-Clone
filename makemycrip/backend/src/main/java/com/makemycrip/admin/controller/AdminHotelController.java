package com.makemycrip.admin.controller;

import com.makemycrip.admin.dto.*;
import com.makemycrip.admin.service.AdminHotelService;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.hotel.dto.HotelDetailDto;
import com.makemycrip.hotel.dto.RoomTypeDto;
import com.makemycrip.hotel.entity.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/hotels")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Hotels", description = "Hotel management for admins")
public class AdminHotelController {

    private final AdminHotelService adminHotelService;

    // ── Hotel CRUD ──────────────────────────────────────────────────────────────

    @Operation(summary = "List all hotels (admin)")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<HotelDetailDto>>> listHotels(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.listHotels(page, size, city, status, search), "Hotels fetched successfully"));
    }

    @Operation(summary = "Get hotel by ID (admin)")
    @GetMapping("/{hotelId}")
    public ResponseEntity<ApiResponse<HotelDetailDto>> getHotel(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.getHotelById(hotelId), "Hotel fetched successfully"));
    }

    @Operation(summary = "Create hotel")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HotelDetailDto>> createHotel(
            @Valid @RequestBody CreateHotelRequest request,
            @AuthenticationPrincipal String adminId) {
        HotelDetailDto hotel = adminHotelService.createHotel(request, UUID.fromString(adminId));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(hotel, "Hotel created successfully", HttpStatus.CREATED));
    }

    @Operation(summary = "Update hotel — all fields")
    @PutMapping("/{hotelId}")
    public ResponseEntity<ApiResponse<HotelDetailDto>> updateHotel(
            @PathVariable UUID hotelId,
            @RequestBody UpdateHotelRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updateHotel(hotelId, request, UUID.fromString(adminId)),
                "Hotel updated successfully"));
    }

    @Operation(summary = "Change hotel status")
    @PatchMapping("/{hotelId}/status")
    public ResponseEntity<ApiResponse<HotelDetailDto>> changeStatus(
            @PathVariable UUID hotelId,
            @Valid @RequestBody HotelStatusChangeRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.changeStatus(hotelId, request, UUID.fromString(adminId)),
                "Hotel status updated"));
    }

    @Operation(summary = "Generate inventory for 365 days")
    @PostMapping("/{hotelId}/inventory/generate")
    public ResponseEntity<ApiResponse<Void>> generateInventory(
            @PathVariable UUID hotelId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.generateInventory(hotelId);
        return ResponseEntity.ok(ApiResponse.success(null, "Inventory generated for next 365 days"));
    }

    // ── Room Types ──────────────────────────────────────────────────────────────

    @Operation(summary = "Get room types for a hotel")
    @GetMapping("/{hotelId}/room-types")
    public ResponseEntity<ApiResponse<List<RoomTypeDto>>> getRoomTypes(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.success(adminHotelService.getRoomTypes(hotelId), "Room types fetched"));
    }

    @Operation(summary = "Create room type")
    @PostMapping("/{hotelId}/room-types")
    public ResponseEntity<ApiResponse<RoomTypeDto>> createRoomType(
            @PathVariable UUID hotelId,
            @RequestBody RoomTypeRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.createRoomType(hotelId, request, UUID.fromString(adminId)),
                "Room type created", HttpStatus.CREATED));
    }

    @Operation(summary = "Update room type")
    @PutMapping("/room-types/{roomTypeId}")
    public ResponseEntity<ApiResponse<RoomTypeDto>> updateRoomType(
            @PathVariable UUID roomTypeId,
            @RequestBody RoomTypeRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updateRoomType(roomTypeId, request, UUID.fromString(adminId)),
                "Room type updated"));
    }

    @Operation(summary = "Delete room type")
    @DeleteMapping("/room-types/{roomTypeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRoomType(
            @PathVariable UUID roomTypeId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deleteRoomType(roomTypeId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Room type deleted"));
    }

    @Operation(summary = "Upload room type image")
    @PostMapping(value = "/room-types/{roomTypeId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<RoomTypeImage>> uploadRoomTypeImage(
            @PathVariable UUID roomTypeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Boolean isPrimary,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.uploadRoomTypeImage(roomTypeId, file, isPrimary, UUID.fromString(adminId)),
                "Room type image uploaded", HttpStatus.CREATED));
    }

    @Operation(summary = "Delete room type image")
    @DeleteMapping("/room-types/{roomTypeId}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoomTypeImage(
            @PathVariable UUID roomTypeId,
            @PathVariable UUID imageId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deleteRoomTypeImage(roomTypeId, imageId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Room type image deleted"));
    }

    // ── Amenities ───────────────────────────────────────────────────────────────

    @Operation(summary = "Add amenity to hotel")
    @PostMapping("/{hotelId}/amenities")
    public ResponseEntity<ApiResponse<HotelAmenity>> addAmenity(
            @PathVariable UUID hotelId,
            @RequestBody AmenityRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.addAmenity(hotelId, request, UUID.fromString(adminId)),
                "Amenity added", HttpStatus.CREATED));
    }

    @Operation(summary = "Update amenity")
    @PutMapping("/{hotelId}/amenities/{amenityId}")
    public ResponseEntity<ApiResponse<HotelAmenity>> updateAmenity(
            @PathVariable UUID hotelId,
            @PathVariable UUID amenityId,
            @RequestBody AmenityRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updateAmenity(hotelId, amenityId, request, UUID.fromString(adminId)),
                "Amenity updated"));
    }

    @Operation(summary = "Delete amenity")
    @DeleteMapping("/{hotelId}/amenities/{amenityId}")
    public ResponseEntity<ApiResponse<Void>> deleteAmenity(
            @PathVariable UUID hotelId,
            @PathVariable UUID amenityId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deleteAmenity(hotelId, amenityId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Amenity deleted"));
    }

    // ── Nearby Places ───────────────────────────────────────────────────────────

    @Operation(summary = "Add nearby place")
    @PostMapping("/{hotelId}/nearby-places")
    public ResponseEntity<ApiResponse<HotelNearbyPlace>> addNearbyPlace(
            @PathVariable UUID hotelId,
            @RequestBody NearbyPlaceRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.addNearbyPlace(hotelId, request, UUID.fromString(adminId)),
                "Nearby place added", HttpStatus.CREATED));
    }

    @Operation(summary = "Update nearby place")
    @PutMapping("/{hotelId}/nearby-places/{placeId}")
    public ResponseEntity<ApiResponse<HotelNearbyPlace>> updateNearbyPlace(
            @PathVariable UUID hotelId,
            @PathVariable UUID placeId,
            @RequestBody NearbyPlaceRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updateNearbyPlace(hotelId, placeId, request, UUID.fromString(adminId)),
                "Nearby place updated"));
    }

    @Operation(summary = "Delete nearby place")
    @DeleteMapping("/{hotelId}/nearby-places/{placeId}")
    public ResponseEntity<ApiResponse<Void>> deleteNearbyPlace(
            @PathVariable UUID hotelId,
            @PathVariable UUID placeId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deleteNearbyPlace(hotelId, placeId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Nearby place deleted"));
    }

    // ── Policies ────────────────────────────────────────────────────────────────

    @Operation(summary = "Add policy")
    @PostMapping("/{hotelId}/policies")
    public ResponseEntity<ApiResponse<HotelPolicy>> addPolicy(
            @PathVariable UUID hotelId,
            @RequestBody PolicyRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.addPolicy(hotelId, request, UUID.fromString(adminId)),
                "Policy added", HttpStatus.CREATED));
    }

    @Operation(summary = "Update policy")
    @PutMapping("/{hotelId}/policies/{policyId}")
    public ResponseEntity<ApiResponse<HotelPolicy>> updatePolicy(
            @PathVariable UUID hotelId,
            @PathVariable UUID policyId,
            @RequestBody PolicyRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updatePolicy(hotelId, policyId, request, UUID.fromString(adminId)),
                "Policy updated"));
    }

    @Operation(summary = "Delete policy")
    @DeleteMapping("/{hotelId}/policies/{policyId}")
    public ResponseEntity<ApiResponse<Void>> deletePolicy(
            @PathVariable UUID hotelId,
            @PathVariable UUID policyId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deletePolicy(hotelId, policyId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Policy deleted"));
    }

    // ── FAQs ────────────────────────────────────────────────────────────────────

    @Operation(summary = "Add FAQ")
    @PostMapping("/{hotelId}/faqs")
    public ResponseEntity<ApiResponse<HotelFaq>> addFaq(
            @PathVariable UUID hotelId,
            @RequestBody FaqRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.addFaq(hotelId, request, UUID.fromString(adminId)),
                "FAQ added", HttpStatus.CREATED));
    }

    @Operation(summary = "Update FAQ")
    @PutMapping("/{hotelId}/faqs/{faqId}")
    public ResponseEntity<ApiResponse<HotelFaq>> updateFaq(
            @PathVariable UUID hotelId,
            @PathVariable UUID faqId,
            @RequestBody FaqRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updateFaq(hotelId, faqId, request, UUID.fromString(adminId)),
                "FAQ updated"));
    }

    @Operation(summary = "Delete FAQ")
    @DeleteMapping("/{hotelId}/faqs/{faqId}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(
            @PathVariable UUID hotelId,
            @PathVariable UUID faqId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deleteFaq(hotelId, faqId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "FAQ deleted"));
    }

    // ── Images ──────────────────────────────────────────────────────────────────

    @Operation(summary = "Upload hotel image")
    @PostMapping(value = "/{hotelId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<HotelImage>> uploadImage(
            @PathVariable UUID hotelId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String caption,
            @RequestParam(required = false) Boolean isPrimary,
            @RequestParam(required = false) Integer sortOrder,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminHotelService.uploadImage(hotelId, file, category, caption, isPrimary, sortOrder,
                        UUID.fromString(adminId)),
                "Image uploaded", HttpStatus.CREATED));
    }

    @Operation(summary = "Update image metadata")
    @PutMapping("/{hotelId}/images/{imageId}")
    public ResponseEntity<ApiResponse<HotelImage>> updateImage(
            @PathVariable UUID hotelId,
            @PathVariable UUID imageId,
            @RequestBody java.util.Map<String, Object> body,
            @AuthenticationPrincipal String adminId) {
        String caption = (String) body.get("caption");
        String category = (String) body.get("category");
        Boolean isPrimary = body.get("isPrimary") != null ? (Boolean) body.get("isPrimary") : null;
        return ResponseEntity.ok(ApiResponse.success(
                adminHotelService.updateImage(hotelId, imageId, caption, category, isPrimary,
                        UUID.fromString(adminId)),
                "Image updated"));
    }

    @Operation(summary = "Delete hotel image")
    @DeleteMapping("/{hotelId}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable UUID hotelId,
            @PathVariable UUID imageId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.deleteImage(hotelId, imageId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Image deleted"));
    }

    @Operation(summary = "Set primary image")
    @PutMapping("/{hotelId}/images/{imageId}/set-primary")
    public ResponseEntity<ApiResponse<Void>> setPrimaryImage(
            @PathVariable UUID hotelId,
            @PathVariable UUID imageId,
            @AuthenticationPrincipal String adminId) {
        adminHotelService.setPrimaryImage(hotelId, imageId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Primary image set"));
    }
}
