package com.makemycrip.common.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AdminAuditLogRepository repository;
    private final ObjectMapper objectMapper;

    @Async
    public void log(UUID adminId, String action, String entityType, UUID entityId,
                    Object oldData, Object newData, String ipAddress, String reason) {
        try {
            AdminAuditLog entry = AdminAuditLog.builder()
                    .adminId(adminId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldData(oldData != null ? objectMapper.writeValueAsString(oldData) : null)
                    .newData(newData != null ? objectMapper.writeValueAsString(newData) : null)
                    .ipAddress(ipAddress)
                    .reason(reason)
                    .build();
            repository.save(entry);
        } catch (Exception e) {
            log.error("Failed to save audit log for action={} entity={}/{}", action, entityType, entityId, e);
        }
    }
}
