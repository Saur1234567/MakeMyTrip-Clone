package com.makemycrip.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private UserInfo user;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserInfo {
        private UUID id;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        /** Primary role (backward compat) */
        private String role;
        /** All roles this user holds — a user can be ADMIN + HOTEL_MANAGER + USER */
        private List<String> roles;
        private String loyaltyTier;
        private Integer loyaltyPoints;
        private Boolean isEmailVerified;
        private String dateOfBirth;
        private String gender;
        private String profilePictureUrl;
    }
}
