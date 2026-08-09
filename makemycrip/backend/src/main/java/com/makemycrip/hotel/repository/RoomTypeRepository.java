package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, UUID> {

    List<RoomType> findByHotelIdAndIsActiveTrueOrderBySortOrderAsc(UUID hotelId);

    List<RoomType> findByHotelIdOrderBySortOrderAsc(UUID hotelId);

    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.id = :hotelId " +
           "AND rt.isActive = true AND rt.isAvailableForBooking = true " +
           "ORDER BY rt.sortOrder ASC")
    List<RoomType> findAvailableByHotelId(UUID hotelId);
}
