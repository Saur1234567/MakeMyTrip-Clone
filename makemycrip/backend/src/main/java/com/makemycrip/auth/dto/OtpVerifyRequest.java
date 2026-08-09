package com.makemycrip.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.makemycrip.auth.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class OtpVerifyRequest {

    /**
     * Accepts both "identifier" (legacy) and "email" (frontend sends this field name).
     * The frontend RegisterPage sends { email, otp } without a purpose field.
     */
    @NotBlank(message = "Identifier (email or phone) is required")
    @JsonAlias("email")
    private String identifier;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be a 6-digit number")
    private String otp;

    /**
     * Purpose is optional — defaults to EMAIL_VERIFY when not provided.
     * The frontend register flow does not send this field.
     */
    private OtpPurpose purpose = OtpPurpose.EMAIL_VERIFY;
}
