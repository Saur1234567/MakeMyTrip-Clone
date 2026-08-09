package com.makemycrip.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class UserProfileDto {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String role;
    private String loyaltyTier;
    private Integer loyaltyPoints;
    @JsonProperty("isEmailVerified")
    private boolean isEmailVerified;
    /** Serialized as "yyyy-MM-dd" string so the frontend HTML date input can use it directly */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;
    private String gender;
    private String profilePictureUrl;
}
