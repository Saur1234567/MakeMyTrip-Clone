package com.makemycrip.user.repository;

import com.makemycrip.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.isActive = true")
    Optional<User> findActiveByEmail(String email);

    /** Users who have at least one booking in any of the given hotel cities */
    @Query(value = "SELECT DISTINCT u.* FROM users u " +
           "JOIN bookings b ON b.user_id = u.id " +
           "JOIN hotels h ON h.id = b.hotel_id " +
           "WHERE h.city IN :cities AND u.is_active = true",
           nativeQuery = true)
    List<User> findUsersWhoBookedInCities(@Param("cities") List<String> cities);

    /** Users with 2 or more confirmed/completed bookings */
    @Query(value = "SELECT u.* FROM users u WHERE u.is_active = true AND " +
           "(SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id " +
           " AND b.status IN ('CONFIRMED','COMPLETED')) >= 2",
           nativeQuery = true)
    List<User> findReturningCustomers();

    /** Users who have never made a booking */
    @Query(value = "SELECT u.* FROM users u WHERE u.is_active = true AND " +
           "(SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) = 0",
           nativeQuery = true)
    List<User> findUsersWhoNeverBooked();

    /** Users whose last booking was before the given date (inactive) */
    @Query(value = "SELECT u.* FROM users u WHERE u.is_active = true AND " +
           "(SELECT MAX(b.created_at) FROM bookings b WHERE b.user_id = u.id) < :since",
           nativeQuery = true)
    List<User> findInactiveUsers(@Param("since") LocalDateTime since);

    /** Users with a check-in date between fromDate and toDate */
    @Query(value = "SELECT DISTINCT u.* FROM users u " +
           "JOIN bookings b ON b.user_id = u.id " +
           "WHERE b.check_in BETWEEN :from AND :to " +
           "AND b.status IN ('CONFIRMED','PENDING') AND u.is_active = true",
           nativeQuery = true)
    List<User> findUsersWithUpcomingCheckin(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
