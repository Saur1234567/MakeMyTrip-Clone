package com.makemycrip.auth.service;

import com.makemycrip.auth.entity.OtpStore;
import com.makemycrip.auth.enums.OtpPurpose;
import com.makemycrip.auth.repository.OtpStoreRepository;
import com.makemycrip.common.exception.BusinessLogicException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private static final int MAX_ATTEMPTS = 3;
    private static final int OTP_EXPIRY_MINUTES = 10;

    private final OtpStoreRepository otpStoreRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String generateOtp(String identifier, OtpPurpose purpose) {
        otpStoreRepository.invalidateAllForIdentifier(identifier, purpose);
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        OtpStore otpStore = OtpStore.builder()
                .identifier(identifier)
                .otpHash(passwordEncoder.encode(otp))
                .purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                .build();
        otpStoreRepository.save(otpStore);
        log.info("OTP generated for identifier={} purpose={}", identifier, purpose);
        return otp;
    }

    @Transactional
    public boolean verifyOtp(String identifier, String otp, OtpPurpose purpose) {
        OtpStore stored = otpStoreRepository
                .findTopByIdentifierAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(identifier, purpose)
                .orElseThrow(() -> new BusinessLogicException("No active OTP found. Please request a new one.", "OTP_NOT_FOUND"));

        if (stored.isExpired()) {
            throw new BusinessLogicException("OTP has expired. Please request a new one.", "OTP_EXPIRED");
        }

        if (stored.getAttempts() >= MAX_ATTEMPTS) {
            throw new BusinessLogicException("Too many failed attempts. Please request a new OTP.", "OTP_MAX_ATTEMPTS");
        }

        if (!passwordEncoder.matches(otp, stored.getOtpHash())) {
            stored.setAttempts(stored.getAttempts() + 1);
            otpStoreRepository.save(stored);
            int remaining = MAX_ATTEMPTS - stored.getAttempts();
            throw new BusinessLogicException(
                    "Invalid OTP. " + remaining + " attempt(s) remaining.", "OTP_INVALID");
        }

        stored.setIsUsed(true);
        otpStoreRepository.save(stored);
        return true;
    }
}
