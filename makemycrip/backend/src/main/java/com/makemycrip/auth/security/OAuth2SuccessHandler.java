package com.makemycrip.auth.security;

import com.makemycrip.auth.entity.UserSession;
import com.makemycrip.auth.repository.UserSessionRepository;
import com.makemycrip.auth.service.UserAgentParser;
import com.makemycrip.auth.service.GeoLocationService;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.enums.DeviceType;
import com.makemycrip.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * Called by Spring Security after a successful Google OAuth2 login.
 * Generates JWT access + refresh tokens and redirects the browser to the
 * frontend callback page with the tokens as query parameters.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserAgentParser userAgentParser;
    private final GeoLocationService geoLocationService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = (String) attributes.get("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found after OAuth2 login: " + email));

        // Build session
        String ipAddress = getClientIp(request);
        String userAgentStr = request.getHeader("User-Agent");
        Map<String, String> uaInfo = userAgentParser.parse(userAgentStr);
        Map<String, String> geoInfo = geoLocationService.getLocation(ipAddress);
        DeviceType deviceType = userAgentParser.detectDeviceType(userAgentStr);

        UUID sessionId = UUID.randomUUID();
        java.util.List<String> roleNames = user.getRoleNames();

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

        log.info("OAuth2 login success: userId={} email={}", user.getId(), email);

        // Redirect to frontend callback with tokens as query params
        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendUrl + "/auth/oauth2/callback")
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("userId", user.getId().toString())
                .queryParam("email", user.getEmail())
                .queryParam("firstName", user.getFirstName())
                .queryParam("lastName", user.getLastName() != null ? user.getLastName() : "")
                .queryParam("role", user.getRole().name())
                .queryParam("loyaltyTier", user.getLoyaltyTier().name())
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
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
