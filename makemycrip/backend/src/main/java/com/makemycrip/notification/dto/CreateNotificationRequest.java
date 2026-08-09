package com.makemycrip.notification.dto;

import com.makemycrip.notification.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CreateNotificationRequest {
    private UUID userId;
    private NotificationType type;
    private String title;
    private String message;
    private String actionUrl;
    private String category;
    private UUID referenceId;
    private String referenceType;
    private LocalDateTime expiresAt;
}
