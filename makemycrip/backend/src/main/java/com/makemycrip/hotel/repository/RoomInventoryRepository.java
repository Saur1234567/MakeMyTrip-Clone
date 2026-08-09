package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.entity.RoomInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomInventoryRepository extends JpaRepository<RoomInventory, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ri FROM RoomInventory ri WHERE ri.roomTypeId = :roomTypeId AND ri.date = :date")
    Optional<RoomInventory> findByRoomTypeIdAndDateForUpdate(UUID roomTypeId, LocalDate date);

    List<RoomInventory> findByRoomTypeIdAndDateBetweenOrderByDateAsc(UUID roomTypeId,
                                                                       LocalDate from, LocalDate to);

    @Query("SELECT ri FROM RoomInventory ri WHERE ri.roomTypeId = :roomTypeId " +
           "AND ri.date BETWEEN :checkIn AND :checkOut AND ri.isBlocked = false " +
           "ORDER BY ri.date ASC")
    List<RoomInventory> findAvailableForPeriod(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut);

    @Query("SELECT MIN(ri.availableRooms) FROM RoomInventory ri WHERE ri.roomTypeId = :roomTypeId " +
           "AND ri.date >= :checkIn AND ri.date < :checkOut AND ri.isBlocked = false")
    Integer findMinAvailableRooms(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut);

    @Modifying
    @Query("UPDATE RoomInventory ri SET ri.availableRooms = ri.availableRooms - 1, " +
           "ri.bookedRooms = ri.bookedRooms + 1, ri.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE ri.roomTypeId = :roomTypeId AND ri.date >= :checkIn AND ri.date < :checkOut " +
           "AND ri.availableRooms > 0")
    int decrementInventory(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut);

    @Modifying
    @Query("UPDATE RoomInventory ri SET ri.availableRooms = ri.availableRooms + 1, " +
           "ri.bookedRooms = ri.bookedRooms - 1, ri.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE ri.roomTypeId = :roomTypeId AND ri.date >= :checkIn AND ri.date < :checkOut")
    void incrementInventory(UUID roomTypeId, LocalDate checkIn, LocalDate checkOut);
}
