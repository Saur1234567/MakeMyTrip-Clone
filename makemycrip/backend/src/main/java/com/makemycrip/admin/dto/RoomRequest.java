package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RoomRequest {
    private String roomNumber;
    private Integer floorNumber;
    private UUID roomTypeId;
    private Boolean isActive;
    private Boolean isBlocked;
    private String blockReason;
    private LocalDateTime blockedFrom;
    private LocalDateTime blockedUntil;
    private String notes;
}
