package com.makemycrip.hotel.service;

import com.makemycrip.common.exception.BusinessLogicException;
import com.makemycrip.common.exception.DuplicateResourceException;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.dto.ReviewDto;
import com.makemycrip.hotel.dto.ReviewRequest;
import com.makemycrip.hotel.entity.Review;
import com.makemycrip.hotel.enums.ReviewStatus;
import com.makemycrip.hotel.enums.TravelType;
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

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public Page<ReviewDto> getHotelReviews(UUID hotelId, int page, int size) {
        return reviewRepository.findByHotelIdAndStatus(hotelId, ReviewStatus.APPROVED,
                PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::mapToDto);
    }

    @Transactional
    public ReviewDto submitReview(UUID hotelId, UUID userId, ReviewRequest request) {
        if (reviewRepository.existsByBookingId(request.getBookingId())) {
            throw new DuplicateResourceException("Review already submitted for this booking");
        }
        TravelType travelType = null;
        if (request.getTravelType() != null) {
            try {
                travelType = TravelType.valueOf(request.getTravelType().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessLogicException("Invalid travel type: " + request.getTravelType());
            }
        }
        Review review = Review.builder()
                .bookingId(request.getBookingId())
                .hotelId(hotelId)
                .userId(userId)
                .overallRating(request.getOverallRating())
                .cleanlinessRating(request.getCleanlinessRating())
                .serviceRating(request.getServiceRating())
                .locationRating(request.getLocationRating())
                .valueRating(request.getValueRating())
                .title(request.getTitle())
                .reviewText(request.getReviewText())
                .travelType(travelType)
                .status(ReviewStatus.PENDING)
                .build();
        Review saved = reviewRepository.save(review);
        log.info("Review submitted: reviewId={} hotelId={} userId={}", saved.getId(), hotelId, userId);
        return mapToDto(saved);
    }

    private ReviewDto mapToDto(Review review) {
        User user = userRepository.findById(review.getUserId()).orElse(null);
        return ReviewDto.builder()
                .id(review.getId())
                .userId(review.getUserId())
                .userFirstName(user != null ? user.getFirstName() : null)
                .userLastName(user != null ? user.getLastName() : null)
                .userProfilePicture(user != null ? user.getProfilePictureUrl() : null)
                .overallRating(review.getOverallRating())
                .cleanlinessRating(review.getCleanlinessRating())
                .serviceRating(review.getServiceRating())
                .locationRating(review.getLocationRating())
                .valueRating(review.getValueRating())
                .title(review.getTitle())
                .reviewText(review.getReviewText())
                .travelType(review.getTravelType() != null ? review.getTravelType().name() : null)
                .adminResponse(review.getAdminResponse())
                .adminRespondedAt(review.getAdminRespondedAt())
                .helpfulCount(review.getHelpfulCount())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
