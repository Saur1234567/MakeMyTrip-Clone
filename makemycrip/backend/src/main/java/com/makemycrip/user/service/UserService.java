package com.makemycrip.user.service;

import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.dto.HotelSummaryDto;
import com.makemycrip.hotel.service.WishlistService;
import com.makemycrip.user.dto.UpdateProfileRequest;
import com.makemycrip.user.dto.UserProfileDto;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final WishlistService wishlistService;

    public UserProfileDto getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return mapToDto(user);
    }

    @Transactional
    public UserProfileDto updateProfilePicture(UUID userId, String imageDataUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        user.setProfilePictureUrl(imageDataUrl);
        user = userRepository.save(user);
        log.info("Profile picture updated for userId={}", userId);
        return mapToDto(user);
    }

    @Transactional
    public UserProfileDto updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        // Only update phone if it changed (avoid unique constraint re-check on same value)
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String newPhone = request.getPhone().trim();
            if (!newPhone.equals(user.getPhone())) {
                user.setPhone(newPhone);
            }
        }

        if (request.getDateOfBirth() != null) user.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null) user.setGender(request.getGender());

        user = userRepository.save(user);
        log.info("Profile updated for userId={}", userId);
        return mapToDto(user);
    }

    public List<HotelSummaryDto> getWishlist(UUID userId) {
        return wishlistService.getUserWishlist(userId);
    }

    private UserProfileDto mapToDto(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .loyaltyTier(user.getLoyaltyTier().name())
                .loyaltyPoints(user.getLoyaltyPoints())
                .isEmailVerified(Boolean.TRUE.equals(user.getIsEmailVerified()))
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender() != null ? user.getGender().name() : null)
                .profilePictureUrl(user.getProfilePictureUrl())
                .build();
    }
}
