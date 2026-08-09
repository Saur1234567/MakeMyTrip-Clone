package com.makemycrip.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HotelStatusChangeRequest {

    @NotNull(message = "Status is required")
    private String status;

    @NotBlank(message = "Reason is required")
    private String reason;

    private Boolean cancelAffectedBookings;
}
