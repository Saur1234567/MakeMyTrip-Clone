package com.makemycrip.notification.controller;

import com.makemycrip.common.response.ApiResponse;
import com.makemycrip.notification.dto.NotificationDto;
import com.makemycrip.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notification center")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Get paginated notifications for current user")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationDto>>> getNotifications(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<NotificationDto> result = notificationService.getNotifications(
                UUID.fromString(userId), type, page, Math.min(size, 50));
        return ResponseEntity.ok(ApiResponse.success(result, "Notifications retrieved"));
    }

    @Operation(summary = "Get unread notification count")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal String userId) {
        long count = notificationService.getUnreadCount(UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count), "OK"));
    }

    @Operation(summary = "Mark a notification as read")
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id) {
        notificationService.markRead(UUID.fromString(userId), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Marked as read"));
    }

    @Operation(summary = "Mark all notifications as read")
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllRead(
            @AuthenticationPrincipal String userId) {
        int count = notificationService.markAllRead(UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponse.success(Map.of("updated", count), "All marked as read"));
    }

    @Operation(summary = "Delete a notification")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id) {
        notificationService.delete(UUID.fromString(userId), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification deleted"));
    }
}
