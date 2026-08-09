package com.makemycrip.admin.controller;

import com.makemycrip.admin.dto.InventoryUpdateRequest;
import com.makemycrip.admin.dto.RoomRequest;
import com.makemycrip.admin.service.AdminRoomService;
import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.hotel.entity.Room;
import com.makemycrip.hotel.entity.RoomInventory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
@Tag(name = "Admin - Rooms & Inventory")
public class AdminRoomController {

    private final AdminRoomService adminRoomService;

    // ── Rooms ────────────────────────────────────────────────────────────────────

    @Operation(summary = "List rooms for hotel")
    @GetMapping("/api/v1/admin/hotels/{hotelId}/rooms")
    public ResponseEntity<ApiResponse<List<Room>>> listRooms(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.success(adminRoomService.listRooms(hotelId), "Rooms fetched"));
    }

    @Operation(summary = "Create room")
    @PostMapping("/api/v1/admin/hotels/{hotelId}/rooms")
    public ResponseEntity<ApiResponse<Room>> createRoom(
            @PathVariable UUID hotelId,
            @RequestBody RoomRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminRoomService.createRoom(hotelId, request, UUID.fromString(adminId)),
                "Room created", HttpStatus.CREATED));
    }

    @Operation(summary = "Bulk create rooms")
    @PostMapping("/api/v1/admin/hotels/{hotelId}/rooms/bulk")
    public ResponseEntity<ApiResponse<List<Room>>> bulkCreateRooms(
            @PathVariable UUID hotelId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String adminId) {
        int from = ((Number) body.get("fromNumber")).intValue();
        int to = ((Number) body.get("toNumber")).intValue();
        int floor = ((Number) body.get("floorNumber")).intValue();
        UUID roomTypeId = UUID.fromString((String) body.get("roomTypeId"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminRoomService.bulkCreateRooms(hotelId, from, to, floor, roomTypeId, UUID.fromString(adminId)),
                "Rooms created", HttpStatus.CREATED));
    }

    @Operation(summary = "Update room")
    @PutMapping("/api/v1/admin/rooms/{roomId}")
    public ResponseEntity<ApiResponse<Room>> updateRoom(
            @PathVariable UUID roomId,
            @RequestBody RoomRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminRoomService.updateRoom(roomId, request, UUID.fromString(adminId)), "Room updated"));
    }

    @Operation(summary = "Delete room")
    @DeleteMapping("/api/v1/admin/rooms/{roomId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal String adminId) {
        adminRoomService.deleteRoom(roomId, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(null, "Room deleted"));
    }

    @Operation(summary = "Block room")
    @PutMapping("/api/v1/admin/rooms/{roomId}/block")
    public ResponseEntity<ApiResponse<Room>> blockRoom(
            @PathVariable UUID roomId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String adminId) {
        String reason = (String) body.get("reason");
        LocalDateTime from = body.get("blockedFrom") != null ? LocalDateTime.parse((String) body.get("blockedFrom")) : null;
        LocalDateTime until = body.get("blockedUntil") != null ? LocalDateTime.parse((String) body.get("blockedUntil")) : null;
        return ResponseEntity.ok(ApiResponse.success(
                adminRoomService.blockRoom(roomId, reason, from, until, UUID.fromString(adminId)), "Room blocked"));
    }

    @Operation(summary = "Unblock room")
    @PutMapping("/api/v1/admin/rooms/{roomId}/unblock")
    public ResponseEntity<ApiResponse<Room>> unblockRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminRoomService.unblockRoom(roomId, UUID.fromString(adminId)), "Room unblocked"));
    }

    // ── Inventory ────────────────────────────────────────────────────────────────

    @Operation(summary = "Get inventory for hotel")
    @GetMapping("/api/v1/admin/hotels/{hotelId}/inventory")
    public ResponseEntity<ApiResponse<List<RoomInventory>>> getInventory(
            @PathVariable UUID hotelId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(ApiResponse.success(
                adminRoomService.getInventory(hotelId, from, to), "Inventory fetched"));
    }

    @Operation(summary = "Update inventory for a specific date")
    @PutMapping("/api/v1/admin/inventory/{roomTypeId}/{date}")
    public ResponseEntity<ApiResponse<RoomInventory>> updateInventory(
            @PathVariable UUID roomTypeId,
            @PathVariable String date,
            @RequestBody InventoryUpdateRequest request,
            @AuthenticationPrincipal String adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminRoomService.updateInventory(roomTypeId, date, request, UUID.fromString(adminId)),
                "Inventory updated"));
    }

    @Operation(summary = "Bulk update inventory for date range")
    @PutMapping("/api/v1/admin/inventory/{roomTypeId}/bulk")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkUpdateInventory(
            @PathVariable UUID roomTypeId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestBody InventoryUpdateRequest request,
            @AuthenticationPrincipal String adminId) {
        int count = adminRoomService.bulkUpdateInventory(roomTypeId, from, to, request, UUID.fromString(adminId));
        return ResponseEntity.ok(ApiResponse.success(Map.of("updated", count), "Inventory bulk updated"));
    }
}
