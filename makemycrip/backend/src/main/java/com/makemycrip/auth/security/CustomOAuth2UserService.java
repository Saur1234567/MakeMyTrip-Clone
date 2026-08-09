package com.makemycrip.auth.security;

import com.makemycrip.user.entity.User;
import com.makemycrip.user.enums.UserRole;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Loads or creates a local User record from the Google OAuth2 profile.
 * Called by Spring Security after Google successfully authenticates the user.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = (String) attributes.get("email");
        String firstName = (String) attributes.getOrDefault("given_name", "");
        String lastName = (String) attributes.getOrDefault("family_name", "");
        String pictureUrl = (String) attributes.get("picture");

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("Email not provided by Google");
        }

        // Find existing user or create a new one
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            log.info("Creating new user from Google OAuth: email={}", email);
            User newUser = User.builder()
                    .email(email)
                    .firstName(firstName != null && !firstName.isBlank() ? firstName : email.split("@")[0])
                    .lastName(lastName)
                    .profilePictureUrl(pictureUrl)
                    .isEmailVerified(true)   // Google already verified the email
                    .isActive(true)
                    .role(UserRole.USER)
                    .build();
            return userRepository.save(newUser);
        });

        // Update profile picture if changed
        if (pictureUrl != null && !pictureUrl.equals(user.getProfilePictureUrl())) {
            user.setProfilePictureUrl(pictureUrl);
            userRepository.save(user);
        }

        // Ensure email is verified for OAuth users
        if (!Boolean.TRUE.equals(user.getIsEmailVerified())) {
            user.setIsEmailVerified(true);
            userRepository.save(user);
        }

        log.info("OAuth2 user loaded: userId={} email={}", user.getId(), email);
        return oAuth2User;
    }
}
