package com.makemycrip.booking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GuestRequest {

    private String guestType = "ADULT";
    private Boolean isPrimary = false;
    private String title;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String lastName;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String nationality;
    private String idType;
    private String idNumber;
}
