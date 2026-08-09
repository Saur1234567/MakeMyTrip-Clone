package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.enums.HotelStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, UUID>, JpaSpecificationExecutor<Hotel> {

    long countByStatus(HotelStatus status);

    Optional<Hotel> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Page<Hotel> findByCityIgnoreCaseAndStatus(String city, HotelStatus status, Pageable pageable);

    @Query("SELECT h FROM Hotel h WHERE LOWER(h.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(h.city) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Hotel> searchByNameOrCity(String search, Pageable pageable);

    @Query("SELECT h FROM Hotel h WHERE h.status = 'ACTIVE' AND h.isFeatured = true ORDER BY h.starRating DESC")
    Page<Hotel> findFeatured(Pageable pageable);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.hotelId = :hotelId AND b.status IN ('CONFIRMED','CHECKED_IN') " +
           "AND b.checkIn <= :checkOut AND b.checkOut >= :checkIn")
    long countActiveBookingsInPeriod(UUID hotelId, java.time.LocalDate checkIn, java.time.LocalDate checkOut);
}
