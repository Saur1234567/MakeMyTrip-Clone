package com.makemycrip.booking.repository;

import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {

    long countByStatus(BookingStatus status);

    Optional<Booking> findByBookingReference(String bookingReference);

    Page<Booking> findByUserIdOrderByBookedAtDesc(UUID userId, Pageable pageable);

    Page<Booking> findByUserIdAndStatusOrderByBookedAtDesc(UUID userId, BookingStatus status, Pageable pageable);

    @Query("SELECT b FROM Booking b WHERE b.userId = :userId AND b.status IN :statuses ORDER BY b.bookedAt DESC")
    Page<Booking> findByUserIdAndStatusInOrderByBookedAtDesc(UUID userId, List<BookingStatus> statuses, Pageable pageable);

    Page<Booking> findByHotelIdOrderByBookedAtDesc(UUID hotelId, Pageable pageable);

    List<Booking> findByStatusAndBookedAtBefore(BookingStatus status, LocalDateTime before);

    @Query("SELECT b FROM Booking b WHERE b.status = 'CONFIRMED' " +
           "AND b.checkIn = :checkIn AND b.noShowAt IS NULL")
    List<Booking> findConfirmedForCheckIn(LocalDate checkIn);

    @Query("SELECT b FROM Booking b WHERE b.status IN ('CONFIRMED','CHECKED_IN') " +
           "AND b.hotelId = :hotelId AND b.checkIn <= :checkOut AND b.checkOut >= :checkIn")
    List<Booking> findOverlappingBookings(UUID hotelId, LocalDate checkIn, LocalDate checkOut);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.hotelId = :hotelId " +
           "AND b.status IN ('CONFIRMED','CHECKED_IN','PAYMENT_PENDING') " +
           "AND b.checkIn <= :checkOut AND b.checkOut > :checkIn")
    long countActiveBookings(UUID hotelId, LocalDate checkIn, LocalDate checkOut);

    @Query("SELECT b FROM Booking b WHERE b.status = 'PAYMENT_PENDING' AND b.bookedAt < :before")
    List<Booking> findAbandonedBookings(LocalDateTime before);

    @Query("SELECT b FROM Booking b WHERE b.status = 'CONFIRMED' AND b.checkIn = :tomorrow")
    List<Booking> findCheckInsForTomorrow(LocalDate tomorrow);

    @Query("SELECT b FROM Booking b WHERE b.status = 'CHECKED_OUT' AND b.checkedOutAt > :after")
    List<Booking> findRecentCheckOuts(LocalDateTime after);
}
