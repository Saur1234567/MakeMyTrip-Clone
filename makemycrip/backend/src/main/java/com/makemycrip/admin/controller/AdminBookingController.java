package com.makemycrip.admin.controller;

import com.makemycrip.admin.service.AdminBookingService;
import com.makemycrip.booking.dto.BookingResponse;
import com.makemycrip.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Bookings", description = "Admin booking management")
public class AdminBookingController {

    private final AdminBookingService adminBookingService;

    @Operation(summary = "List all bookings")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> listBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID hotelId,
            @RequestParam(required = false) String search) {
        Page<BookingResponse> bookings = adminBookingService.listBookings(page, size, status, hotelId, search);
        return ResponseEntity.ok(ApiResponse.success(bookings, "Bookings fetched"));
    }

    @Operation(summary = "Check in booking")
    @PostMapping("/{bookingId}/check-in")
    public ResponseEntity<ApiResponse<BookingResponse>> checkIn(
            @PathVariable UUID bookingId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        UUID roomId = body.containsKey("roomId") ? UUID.fromString(body.get("roomId")) : null;
        BookingResponse response = adminBookingService.checkIn(bookingId, roomId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(response, "Check-in successful"));
    }

    @Operation(summary = "Check out booking")
    @PostMapping("/{bookingId}/check-out")
    public ResponseEntity<ApiResponse<BookingResponse>> checkOut(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal String adminId) {
        BookingResponse response = adminBookingService.checkOut(bookingId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(response, "Check-out successful"));
    }

    @Operation(summary = "Upgrade room")
    @PostMapping("/{bookingId}/upgrade")
    public ResponseEntity<ApiResponse<BookingResponse>> upgradeRoom(
            @PathVariable UUID bookingId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        UUID newRoomTypeId = UUID.fromString(body.get("newRoomTypeId"));
        BookingResponse response = adminBookingService.upgradeRoom(bookingId, newRoomTypeId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(response, "Room upgraded successfully"));
    }

    @Operation(summary = "Add note to booking")
    @PostMapping("/{bookingId}/notes")
    public ResponseEntity<ApiResponse<Void>> addNote(
            @PathVariable UUID bookingId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        adminBookingService.addNote(bookingId, body.get("note"), UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Note added"));
    }

    @Operation(summary = "Issue manual refund")
    @PostMapping("/{bookingId}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> issueRefund(
            @PathVariable UUID bookingId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String adminId) {
        adminBookingService.issueManualRefund(bookingId,
                new java.math.BigDecimal(body.get("amount")),
                body.get("reason"), adminId);
        return ResponseEntity.ok(ApiResponse.success(null, "Refund issued"));
    }

    @Operation(summary = "Export bookings as CSV")
    @GetMapping("/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID hotelId,
            @RequestParam(required = false) String search) {
        byte[] csv = adminBookingService.exportCsv(status, hotelId, search);
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=\"bookings.csv\"")
                .body(csv);
    }
}
