package com.makemycrip.admin.service;

import com.makemycrip.common.audit.AuditService;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.Review;
import com.makemycrip.hotel.enums.ReviewStatus;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.ReviewRepository;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminReviewService {

    private final ReviewRepository reviewRepository;
    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public Page<Map<String, Object>> listReviews(int page, int size, String status, UUID hotelId) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviews;
        if (hotelId != null && status != null) {
            reviews = reviewRepository.findByHotelIdAndStatus(hotelId, ReviewStatus.valueOf(status.toUpperCase()), pageable);
        } else if (hotelId != null) {
            reviews = reviewRepository.findByHotelIdAndStatus(hotelId, ReviewStatus.PENDING, pageable);
        } else {
            reviews = reviewRepository.findAll(pageable);
        }
        return reviews.map(r -> mapReview(r));
    }

    @Transactional
    public Review approveReview(UUID reviewId, UUID adminId) {
        Review review = getReview(reviewId);
        review.setStatus(ReviewStatus.APPROVED);
        reviewRepository.save(review);
        auditService.log(adminId, "APPROVE_REVIEW", "Review", reviewId, null, null, null, null);
        return review;
    }

    @Transactional
    public Review rejectReview(UUID reviewId, String reason, UUID adminId) {
        Review review = getReview(reviewId);
        review.setStatus(ReviewStatus.REJECTED);
        reviewRepository.save(review);
        auditService.log(adminId, "REJECT_REVIEW", "Review", reviewId, null, null, null, reason);
        return review;
    }

    @Transactional
    public Review flagReview(UUID reviewId, UUID adminId) {
        Review review = getReview(reviewId);
        review.setStatus(ReviewStatus.FLAGGED);
        reviewRepository.save(review);
        auditService.log(adminId, "FLAG_REVIEW", "Review", reviewId, null, null, null, null);
        return review;
    }

    @Transactional
    public Review editReview(UUID reviewId, Map<String, Object> body, UUID adminId) {
        Review review = getReview(reviewId);
        if (body.containsKey("title")) review.setTitle((String) body.get("title"));
        if (body.containsKey("reviewText")) review.setReviewText((String) body.get("reviewText"));
        reviewRepository.save(review);
        auditService.log(adminId, "EDIT_REVIEW", "Review", reviewId, null, null, null, "Admin edited review content");
        return review;
    }

    @Transactional
    public Review addHotelResponse(UUID reviewId, String response, UUID adminId) {
        Review review = getReview(reviewId);
        review.setAdminResponse(response);
        review.setAdminRespondedAt(LocalDateTime.now());
        reviewRepository.save(review);
        auditService.log(adminId, "ADD_HOTEL_RESPONSE", "Review", reviewId, null, null, null, null);
        return review;
    }

    @Transactional
    public void deleteReview(UUID reviewId, UUID adminId) {
        getReview(reviewId);
        reviewRepository.deleteById(reviewId);
        auditService.log(adminId, "DELETE_REVIEW", "Review", reviewId, null, null, null, null);
    }

    private Review getReview(UUID reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
    }

    private Map<String, Object> mapReview(Review r) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", r.getId());
        dto.put("hotelId", r.getHotelId());
        dto.put("userId", r.getUserId());
        dto.put("bookingId", r.getBookingId());
        dto.put("overallRating", r.getOverallRating());
        dto.put("cleanlinessRating", r.getCleanlinessRating());
        dto.put("serviceRating", r.getServiceRating());
        dto.put("locationRating", r.getLocationRating());
        dto.put("valueRating", r.getValueRating());
        dto.put("title", r.getTitle());
        dto.put("reviewText", r.getReviewText());
        dto.put("travelType", r.getTravelType() != null ? r.getTravelType().name() : null);
        dto.put("status", r.getStatus().name());
        dto.put("adminResponse", r.getAdminResponse());
        dto.put("adminRespondedAt", r.getAdminRespondedAt());
        dto.put("helpfulCount", r.getHelpfulCount());
        dto.put("createdAt", r.getCreatedAt());
        // Enrich with hotel name
        hotelRepository.findById(r.getHotelId()).ifPresent(h -> dto.put("hotelName", h.getName()));
        // Enrich with user name
        if (r.getUserId() != null) {
            userRepository.findById(r.getUserId()).ifPresent(u ->
                    dto.put("guestName", u.getFirstName() + " " + u.getLastName()));
        }
        return dto;
    }
}
