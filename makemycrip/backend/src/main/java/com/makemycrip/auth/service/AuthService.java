package com.makemycrip.auth.service;

import com.makemycrip.auth.dto.*;
import com.makemycrip.auth.entity.UserSession;
import com.makemycrip.auth.enums.OtpPurpose;
import com.makemycrip.auth.repository.UserSessionRepository;
import com.makemycrip.auth.security.JwtTokenProvider;
import com.makemycrip.common.exception.BusinessLogicException;
import com.makemycrip.common.exception.DuplicateResourceException;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.notification.service.NotificationDispatcher;
import com.makemycrip.notification.service.ReminderSchedulerService;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.enums.DeviceType;
import com.makemycrip.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_SESSIONS = 5;

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final OtpService otpService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final GeoLocationService geoLocationService;
    private final UserAgentParser userAgentParser;
    private final NotificationDispatcher notificationDispatcher;
    private final ReminderSchedulerService reminderSchedulerService;

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered: " + request.getEmail(), "EMAIL_EXISTS");
        }
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        userRepository.save(user);
        String otp = otpService.generateOtp(request.getEmail(), OtpPurpose.EMAIL_VERIFY);
        notificationDispatcher.sendOtpEmail(user.getEmail(), user.getFirstName(), otp, OtpPurpose.EMAIL_VERIFY);
        // Schedule email verification reminders (24h / 48h / 72h)
        reminderSchedulerService.scheduleEmailVerificationReminders(user.getId());
        log.info("User registered: userId={}", user.getId());
    }

    @Transactional
    public AuthResponse verifyEmail(OtpVerifyRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(request.getIdentifier())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        otpService.verifyOtp(request.getIdentifier(), request.getOtp(), OtpPurpose.EMAIL_VERIFY);
        user.setIsEmailVerified(true);
        userRepository.save(user);
        // Cancel any pending email verification reminders
        reminderSchedulerService.cancelEmailVerificationReminders(user.getId());
        notificationDispatcher.sendWelcomeEmail(user.getEmail(), user.getFirstName());
        log.info("Email verified for userId={}", user.getId());
        // Return auth tokens so the frontend can log the user in immediately after verification
        return createSessionAndTokens(user, httpRequest);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findActiveByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessLogicException("Invalid email or password", "INVALID_CREDENTIALS"));
        if (!user.getIsEmailVerified()) {
            throw new BusinessLogicException("Email not verified. Please verify your email.", "EMAIL_NOT_VERIFIED");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessLogicException("Invalid email or password", "INVALID_CREDENTIALS");
        }
        return createSessionAndTokens(user, httpRequest);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshToken, HttpServletRequest httpRequest) {
        if (!jwtTokenProvider.validateToken(refreshToken) || !jwtTokenProvider.isRefreshToken(refreshToken)) {
            throw new BusinessLogicException("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
        }
        String userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        String sessionId = jwtTokenProvider.getSessionIdFromRefreshToken(refreshToken);
        UserSession session = sessionRepository.findByIdAndUserIdAndIsActiveTrue(
                UUID.fromString(sessionId), UUID.fromString(userId))
                .orElseThrow(() -> new BusinessLogicException("Session not found or expired", "SESSION_EXPIRED"));
        // Rotate: invalidate old session
        sessionRepository.deactivateSession(UUID.fromString(userId), session.getId());
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return createSessionAndTokens(user, httpRequest);
    }

    @Transactional
    public void logout(String userId, String sessionId) {
        sessionRepository.deactivateSession(UUID.fromString(userId), UUID.fromString(sessionId));
        log.info("User logged out: userId={} sessionId={}", userId, sessionId);
    }

    @Transactional
    public void logoutAll(String userId) {
        sessionRepository.deactivateAllSessions(UUID.fromString(userId));
        log.info("All sessions terminated for userId={}", userId);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findActiveByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email"));
        String otp = otpService.generateOtp(request.getEmail(), OtpPurpose.PASSWORD_RESET);
        notificationDispatcher.sendOtpEmail(user.getEmail(), user.getFirstName(), otp, OtpPurpose.PASSWORD_RESET);
        log.info("Password reset OTP sent for userId={}", user.getId());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        otpService.verifyOtp(request.getEmail(), request.getOtp(), OtpPurpose.PASSWORD_RESET);
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        sessionRepository.deactivateAllSessions(user.getId());
        notificationDispatcher.sendPasswordChangedEmail(user.getEmail(), user.getFirstName());
        log.info("Password reset for userId={}", user.getId());
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessLogicException("Current password is incorrect", "WRONG_CURRENT_PASSWORD");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        notificationDispatcher.sendPasswordChangedEmail(user.getEmail(), user.getFirstName());
        log.info("Password changed for userId={}", userId);
    }

    public List<SessionDto> getActiveSessions(String userId) {
        return sessionRepository.findByUserIdAndIsActiveTrue(UUID.fromString(userId))
                .stream()
                .map(s -> SessionDto.builder()
                        .id(s.getId())
                        .deviceType(s.getDeviceType() != null ? s.getDeviceType().name() : null)
                        .deviceName(s.getDeviceName())
                        .browser(s.getBrowser())
                        .os(s.getOs())
                        .ipAddress(s.getIpAddress())
                        .city(s.getCity())
                        .country(s.getCountry())
                        .lastActive(s.getLastActive())
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void revokeSession(String userId, UUID sessionId) {
        sessionRepository.findByIdAndUserIdAndIsActiveTrue(sessionId, UUID.fromString(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        sessionRepository.deactivateSession(UUID.fromString(userId), sessionId);
    }

    private AuthResponse createSessionAndTokens(User user, HttpServletRequest httpRequest) {
        long activeCount = sessionRepository.countByUserIdAndIsActiveTrue(user.getId());
        if (activeCount >= MAX_SESSIONS) {
            List<UserSession> sessions = sessionRepository.findByUserIdAndIsActiveTrue(user.getId());
            sessions.stream().min((a, b) -> {
                if (a.getLastActive() == null) return -1;
                if (b.getLastActive() == null) return 1;
                return a.getLastActive().compareTo(b.getLastActive());
            }).ifPresent(oldest -> sessionRepository.deactivateSession(user.getId(), oldest.getId()));
        }

        String ipAddress = getClientIp(httpRequest);
        String userAgentStr = httpRequest.getHeader("User-Agent");
        Map<String, String> uaInfo = userAgentParser.parse(userAgentStr);
        Map<String, String> geoInfo = geoLocationService.getLocation(ipAddress);
        DeviceType deviceType = userAgentParser.detectDeviceType(userAgentStr);

        UUID sessionId = UUID.randomUUID();
        List<String> roleNames = user.getRoleNames();
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId().toString(), user.getEmail(), user.getRole().name(), roleNames);
        String refreshToken = jwtTokenProvider.generateRefreshToken(
                user.getId().toString(), sessionId.toString());

        UserSession session = UserSession.builder()
                .id(sessionId)
                .userId(user.getId())
                .refreshTokenHash(passwordEncoder.encode(refreshToken))
                .deviceType(deviceType)
                .deviceName(uaInfo.get("deviceName"))
                .browser(uaInfo.get("browser"))
                .os(uaInfo.get("os"))
                .ipAddress(ipAddress)
                .city(geoInfo.get("city"))
                .country(geoInfo.get("country"))
                .build();
        sessionRepository.save(session);

        if (isNewDevice(user.getId(), ipAddress)) {
            notificationDispatcher.sendNewDeviceLoginAlert(user.getEmail(), user.getFirstName(),
                    uaInfo.get("deviceName"), ipAddress, geoInfo.get("city"));
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(900)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .phone(user.getPhone())
                        .role(user.getRole().name())
                        .roles(roleNames)
                        .loyaltyTier(user.getLoyaltyTier().name())
                        .loyaltyPoints(user.getLoyaltyPoints())
                        .isEmailVerified(user.getIsEmailVerified())
                        .dateOfBirth(user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : null)
                        .gender(user.getGender() != null ? user.getGender().name() : null)
                        .profilePictureUrl(user.getProfilePictureUrl())
                        .build())
                .build();
    }

    private boolean isNewDevice(UUID userId, String ipAddress) {
        return sessionRepository.findByUserIdAndIsActiveTrue(userId).stream()
                .noneMatch(s -> ipAddress.equals(s.getIpAddress()));
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null ? realIp : request.getRemoteAddr();
    }
}
