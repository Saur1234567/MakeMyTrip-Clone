package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, UUID> {

    boolean existsByUserIdAndHotelId(UUID userId, UUID hotelId);

    void deleteByUserIdAndHotelId(UUID userId, UUID hotelId);

    List<Wishlist> findByUserIdOrderByAddedAtDesc(UUID userId);

    @Query("SELECT w.hotelId FROM Wishlist w WHERE w.userId = :userId")
    Set<UUID> findHotelIdsByUserId(UUID userId);
}
