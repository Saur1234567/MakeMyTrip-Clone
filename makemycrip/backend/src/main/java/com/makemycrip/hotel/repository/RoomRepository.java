package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByHotelIdOrderByFloorNumberAscRoomNumberAsc(UUID hotelId);

    Page<Room> findByHotelId(UUID hotelId, Pageable pageable);

    boolean existsByHotelIdAndRoomNumber(UUID hotelId, String roomNumber);

    Optional<Room> findByHotelIdAndRoomNumber(UUID hotelId, String roomNumber);

    List<Room> findByHotelIdAndRoomTypeId(UUID hotelId, UUID roomTypeId);

    List<Room> findByHotelIdAndIsBlockedTrue(UUID hotelId);

    long countByHotelIdAndIsActiveTrue(UUID hotelId);

    long countByHotelId(UUID hotelId);

    long countByRoomTypeId(UUID roomTypeId);
}
