package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.entity.Review;
import com.makemycrip.hotel.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Page<Review> findByHotelIdAndStatus(UUID hotelId, ReviewStatus status, Pageable pageable);

    Optional<Review> findByBookingId(UUID bookingId);

    boolean existsByBookingId(UUID bookingId);

    @Query("SELECT AVG(r.overallRating) FROM Review r WHERE r.hotelId = :hotelId AND r.status = 'APPROVED'")
    Double findAverageRatingByHotelId(UUID hotelId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.hotelId = :hotelId AND r.status = 'APPROVED'")
    long countApprovedByHotelId(UUID hotelId);

    java.util.List<Review> findByUserId(UUID userId);
}
