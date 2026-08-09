package com.makemycrip.admin.service;

import com.makemycrip.auth.repository.UserSessionRepository;
import com.makemycrip.booking.dto.BookingResponse;
import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.entity.BookingGuest;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.common.audit.AuditService;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.HotelImage;
import com.makemycrip.hotel.entity.Review;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.ReviewRepository;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.enums.LoyaltyTier;
import com.makemycrip.user.enums.UserRole;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserSessionRepository userSessionRepository;
    private final AuditService auditService;

    public Page<Map<String, Object>> listUsers(int page, int size, String search, String role) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> users = userRepository.findAll(pageable);
        List<Map<String, Object>> mapped = users.getContent().stream()
                .map(this::mapUser)
                .collect(Collectors.toList());
        return new PageImpl<>(mapped, pageable, users.getTotalElements());
    }

    public Map<String, Object> getUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapUser(user);
    }

    @Transactional
    public Map<String, Object> updateUser(UUID userId, Map<String, Object> request, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.containsKey("firstName")) user.setFirstName((String) request.get("firstName"));
        if (request.containsKey("lastName")) user.setLastName((String) request.get("lastName"));
        if (request.containsKey("email")) user.setEmail((String) request.get("email"));
        if (request.containsKey("phone")) user.setPhone((String) request.get("phone"));
        if (request.containsKey("nationality")) user.setNationality((String) request.get("nationality"));
        if (request.containsKey("dateOfBirth") && request.get("dateOfBirth") != null) {
            user.setDateOfBirth(LocalDate.parse((String) request.get("dateOfBirth")));
        }

        userRepository.save(user);
        auditService.log(adminId, "UPDATE_USER", "User", userId, null, user, null, null);
        return mapUser(user);
    }

    @Transactional
    public void banUser(UUID userId, String reason, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsActive(false);
        userRepository.save(user);
        // Terminate all sessions
        userSessionRepository.deactivateAllSessions(userId);
        auditService.log(adminId, "BAN_USER", "User", userId, null, null, null, reason);
        log.info("User banned: userId={} by adminId={}", userId, adminId);
    }

    @Transactional
    public void unbanUser(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsActive(true);
        userRepository.save(user);
        auditService.log(adminId, "UNBAN_USER", "User", userId, null, null, null, null);
    }

    @Transactional
    public void changeRole(UUID userId, String role, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserRole newRole = UserRole.valueOf(role.toUpperCase());
        user.setRole(newRole);
        user.getRoles().clear();
        user.getRoles().add(newRole);
        userRepository.save(user);
        auditService.log(adminId, "CHANGE_USER_ROLE", "User", userId, null,
                Map.of("role", role), null, null);
    }

    @Transactional
    public void setLoyaltyTier(UUID userId, String tier, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setLoyaltyTier(LoyaltyTier.valueOf(tier.toUpperCase()));
        userRepository.save(user);
        auditService.log(adminId, "SET_LOYALTY_TIER", "User", userId, null,
                Map.of("tier", tier), null, null);
    }

    @Transactional
    public void adjustLoyaltyPoints(UUID userId, int points, String reason, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        int newPoints = Math.max(0, user.getLoyaltyPoints() + points);
        user.setLoyaltyPoints(newPoints);
        userRepository.save(user);
        auditService.log(adminId, "ADJUST_LOYALTY_POINTS", "User", userId, null,
                Map.of("points", points, "reason", reason != null ? reason : ""), null, reason);
    }

    @Transactional
    public void verifyEmail(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsEmailVerified(true);
        userRepository.save(user);
        auditService.log(adminId, "VERIFY_EMAIL", "User", userId, null, null, null, null);
    }

    @Transactional
    public void verifyPhone(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsPhoneVerified(true);
        userRepository.save(user);
        auditService.log(adminId, "VERIFY_PHONE", "User", userId, null, null, null, null);
    }

    @Transactional
    public void terminateAllSessions(UUID userId, UUID adminId) {
        userSessionRepository.deactivateAllSessions(userId);
        auditService.log(adminId, "TERMINATE_ALL_SESSIONS", "User", userId, null, null, null, null);
    }

    public Page<Object> getUserBookings(UUID userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("bookedAt").descending());
        Page<Booking> bookings = bookingRepository.findByUserIdOrderByBookedAtDesc(userId, pageable);
        List<Object> mapped = bookings.getContent().stream().map(b -> {
            Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
            RoomType rt = roomTypeRepository.findById(b.getRoomTypeId()).orElse(null);
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", b.getId());
            dto.put("bookingReference", b.getBookingReference());
            dto.put("status", b.getStatus().name());
            dto.put("checkIn", b.getCheckIn());
            dto.put("checkOut", b.getCheckOut());
            dto.put("totalNights", b.getTotalNights());
            dto.put("totalAmount", b.getTotalAmount());
            dto.put("bookedAt", b.getBookedAt());
            dto.put("hotelName", hotel != null ? hotel.getName() : null);
            dto.put("roomTypeName", rt != null ? rt.getName() : null);
            return (Object) dto;
        }).collect(Collectors.toList());
        return new PageImpl<>(mapped, pageable, bookings.getTotalElements());
    }

    public List<Map<String, Object>> getUserReviews(UUID userId) {
        return reviewRepository.findByUserId(userId).stream().map(r -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", r.getId());
            dto.put("hotelId", r.getHotelId());
            dto.put("overallRating", r.getOverallRating());
            dto.put("title", r.getTitle());
            dto.put("reviewText", r.getReviewText());
            dto.put("status", r.getStatus().name());
            dto.put("createdAt", r.getCreatedAt());
            hotelRepository.findById(r.getHotelId()).ifPresent(h -> dto.put("hotelName", h.getName()));
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void deleteUser(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsActive(false);
        user.setEmail(user.getEmail() + "_deleted_" + System.currentTimeMillis());
        userRepository.save(user);
        auditService.log(adminId, "DELETE_USER", "User", userId, null, null, null, null);
    }

    private Map<String, Object> mapUser(User user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", user.getId());
        dto.put("email", user.getEmail());
        dto.put("phone", user.getPhone());
        dto.put("firstName", user.getFirstName());
        dto.put("lastName", user.getLastName());
        dto.put("dateOfBirth", user.getDateOfBirth());
        dto.put("gender", user.getGender() != null ? user.getGender().name() : null);
        dto.put("nationality", user.getNationality());
        dto.put("profilePictureUrl", user.getProfilePictureUrl());
        dto.put("loyaltyTier", user.getLoyaltyTier().name());
        dto.put("loyaltyPoints", user.getLoyaltyPoints());
        dto.put("isEmailVerified", user.getIsEmailVerified());
        dto.put("isPhoneVerified", user.getIsPhoneVerified());
        dto.put("isActive", user.getIsActive());
        dto.put("role", user.getRole().name());
        dto.put("roles", user.getRoles().stream().map(Enum::name).collect(Collectors.toList()));
        dto.put("createdAt", user.getCreatedAt());
        dto.put("updatedAt", user.getUpdatedAt());
        return dto;
    }
}
