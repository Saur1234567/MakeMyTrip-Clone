package com.makemycrip.notification.dto;

import com.makemycrip.notification.enums.NotificationStatus;
import com.makemycrip.notification.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NotificationDto {
    private UUID id;
    private NotificationType type;
    private String title;
    private String message;
    private String actionUrl;
    private String category;
    private NotificationStatus status;
    private UUID referenceId;
    private String referenceType;
    private LocalDateTime readAt;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
