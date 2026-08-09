package com.makemycrip.notification.service;

import com.makemycrip.notification.dto.CreateNotificationRequest;
import com.makemycrip.notification.dto.NotificationDto;
import com.makemycrip.notification.entity.Notification;
import com.makemycrip.notification.enums.NotificationStatus;
import com.makemycrip.notification.enums.NotificationType;
import com.makemycrip.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public NotificationDto create(CreateNotificationRequest req) {
        Notification n = Notification.builder()
                .userId(req.getUserId())
                .type(req.getType() != null ? req.getType() : NotificationType.SYSTEM)
                .title(req.getTitle())
                .message(req.getMessage())
                .actionUrl(req.getActionUrl())
                .category(req.getCategory() != null ? req.getCategory() : req.getType() != null ? req.getType().name() : "SYSTEM")
                .referenceId(req.getReferenceId())
                .referenceType(req.getReferenceType())
                .expiresAt(req.getExpiresAt())
                .status(NotificationStatus.UNREAD)
                .build();
        n = notificationRepository.save(n);

        NotificationDto dto = toDto(n);

        // Push real-time via WebSocket to the specific user
        try {
            messagingTemplate.convertAndSendToUser(
                    req.getUserId().toString(),
                    "/queue/notifications",
                    dto
            );
        } catch (Exception e) {
            log.debug("WebSocket push failed for userId={}: {}", req.getUserId(), e.getMessage());
        }

        return dto;
    }

    public Page<NotificationDto> getNotifications(UUID userId, String type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications;
        if (type != null && !type.isBlank()) {
            try {
                NotificationType nt = NotificationType.valueOf(type.toUpperCase());
                notifications = notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, nt, pageable);
            } catch (IllegalArgumentException e) {
                notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
            }
        } else {
            notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return notifications.map(this::toDto);
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndStatus(userId, NotificationStatus.UNREAD);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(userId) && n.getStatus() == NotificationStatus.UNREAD) {
                n.setStatus(NotificationStatus.READ);
                n.setReadAt(LocalDateTime.now());
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional
    public void delete(UUID userId, UUID notificationId) {
        notificationRepository.deleteByIdAndUserId(notificationId, userId);
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .actionUrl(n.getActionUrl())
                .category(n.getCategory())
                .status(n.getStatus())
                .referenceId(n.getReferenceId())
                .referenceType(n.getReferenceType())
                .readAt(n.getReadAt())
                .expiresAt(n.getExpiresAt())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
