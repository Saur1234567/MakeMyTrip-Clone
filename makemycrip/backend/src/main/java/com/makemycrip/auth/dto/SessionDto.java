package com.makemycrip.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SessionDto {
    private UUID id;
    private String deviceType;
    private String deviceName;
    private String browser;
    private String os;
    private String ipAddress;
    private String city;
    private String country;
    private LocalDateTime lastActive;
    private LocalDateTime createdAt;
    private boolean current;
}
