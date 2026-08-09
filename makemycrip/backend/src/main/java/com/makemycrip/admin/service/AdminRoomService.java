package com.makemycrip.admin.service;

import com.makemycrip.admin.dto.InventoryUpdateRequest;
import com.makemycrip.admin.dto.RoomRequest;
import com.makemycrip.common.audit.AuditService;
import com.makemycrip.common.exception.BusinessLogicException;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.entity.Room;
import com.makemycrip.hotel.entity.RoomInventory;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.RoomInventoryRepository;
import com.makemycrip.hotel.repository.RoomRepository;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomInventoryRepository inventoryRepository;
    private final HotelRepository hotelRepository;
    private final AuditService auditService;

    // ── Rooms ────────────────────────────────────────────────────────────────────

    public List<Room> listRooms(UUID hotelId) {
        return roomRepository.findByHotelIdOrderByFloorNumberAscRoomNumberAsc(hotelId);
    }

    @Transactional
    public Room createRoom(UUID hotelId, RoomRequest request, UUID adminId) {
        if (roomRepository.existsByHotelIdAndRoomNumber(hotelId, request.getRoomNumber())) {
            throw new BusinessLogicException("Room number already exists in this hotel", "DUPLICATE_ROOM");
        }
        Room room = Room.builder()
                .hotelId(hotelId)
                .roomNumber(request.getRoomNumber())
                .floorNumber(request.getFloorNumber())
                .roomTypeId(request.getRoomTypeId())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .isBlocked(false)
                .notes(request.getNotes())
                .build();
        Room saved = roomRepository.save(room);
        // Auto-update hotel.totalRooms
        syncHotelTotalRooms(hotelId);
        auditService.log(adminId, "CREATE_ROOM", "Room", saved.getId(), null, saved, null, null);
        return saved;
    }

    @Transactional
    public List<Room> bulkCreateRooms(UUID hotelId, int fromNumber, int toNumber,
                                       int floorNumber, UUID roomTypeId, UUID adminId) {
        List<Room> created = new ArrayList<>();
        for (int i = fromNumber; i <= toNumber; i++) {
            String roomNum = String.valueOf(i);
            if (!roomRepository.existsByHotelIdAndRoomNumber(hotelId, roomNum)) {
                Room room = Room.builder()
                        .hotelId(hotelId)
                        .roomNumber(roomNum)
                        .floorNumber(floorNumber)
                        .roomTypeId(roomTypeId)
                        .isActive(true)
                        .isBlocked(false)
                        .build();
                created.add(roomRepository.save(room));
            }
        }
        // Auto-update hotel.totalRooms
        syncHotelTotalRooms(hotelId);
        auditService.log(adminId, "BULK_CREATE_ROOMS", "Room", hotelId, null,
                Map.of("count", created.size(), "from", fromNumber, "to", toNumber), null, null);
        return created;
    }

    @Transactional
    public Room updateRoom(UUID roomId, RoomRequest request, UUID adminId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        if (request.getRoomNumber() != null) room.setRoomNumber(request.getRoomNumber());
        if (request.getFloorNumber() != null) room.setFloorNumber(request.getFloorNumber());
        if (request.getRoomTypeId() != null) room.setRoomTypeId(request.getRoomTypeId());
        if (request.getIsActive() != null) room.setIsActive(request.getIsActive());
        if (request.getNotes() != null) room.setNotes(request.getNotes());
        roomRepository.save(room);
        auditService.log(adminId, "UPDATE_ROOM", "Room", roomId, null, room, null, null);
        return room;
    }

    @Transactional
    public void deleteRoom(UUID roomId, UUID adminId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        UUID hotelId = room.getHotelId();
        roomRepository.delete(room);
        // Auto-update hotel.totalRooms
        syncHotelTotalRooms(hotelId);
        auditService.log(adminId, "DELETE_ROOM", "Room", roomId, null, null, null, null);
    }

    @Transactional
    public Room blockRoom(UUID roomId, String reason, LocalDateTime from, LocalDateTime until, UUID adminId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        room.setIsBlocked(true);
        room.setBlockReason(reason);
        room.setBlockedFrom(from != null ? from : LocalDateTime.now());
        room.setBlockedUntil(until);
        room.setBlockedBy(adminId);
        roomRepository.save(room);
        auditService.log(adminId, "BLOCK_ROOM", "Room", roomId, null, null, null, reason);
        return room;
    }

    @Transactional
    public Room unblockRoom(UUID roomId, UUID adminId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        room.setIsBlocked(false);
        room.setBlockReason(null);
        room.setBlockedFrom(null);
        room.setBlockedUntil(null);
        room.setBlockedBy(null);
        roomRepository.save(room);
        auditService.log(adminId, "UNBLOCK_ROOM", "Room", roomId, null, null, null, null);
        return room;
    }

    // ── Inventory ────────────────────────────────────────────────────────────────

    public List<RoomInventory> getInventory(UUID hotelId, String from, String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now();
        LocalDate toDate = to != null ? LocalDate.parse(to) : fromDate.plusDays(29);
        List<RoomType> roomTypes = roomTypeRepository.findByHotelIdOrderBySortOrderAsc(hotelId);
        List<RoomInventory> result = new ArrayList<>();
        for (RoomType rt : roomTypes) {
            result.addAll(inventoryRepository.findByRoomTypeIdAndDateBetweenOrderByDateAsc(
                    rt.getId(), fromDate, toDate));
        }
        return result;
    }

    @Transactional
    public RoomInventory updateInventory(UUID roomTypeId, String dateStr, InventoryUpdateRequest request, UUID adminId) {
        LocalDate date = LocalDate.parse(dateStr);
        RoomInventory inv = inventoryRepository.findByRoomTypeIdAndDateForUpdate(roomTypeId, date)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for date: " + dateStr));

        if (request.getAdminOverridePrice() != null) inv.setAdminOverridePrice(request.getAdminOverridePrice());
        if (request.getMinPriceFloor() != null) inv.setMinPriceFloor(request.getMinPriceFloor());
        if (request.getMaxPriceCeiling() != null) inv.setMaxPriceCeiling(request.getMaxPriceCeiling());
        if (request.getIsBlocked() != null) inv.setIsBlocked(request.getIsBlocked());
        if (request.getBlockReason() != null) inv.setBlockReason(request.getBlockReason());
        if (request.getMinNights() != null) inv.setMinNights(request.getMinNights());
        if (request.getMaxNights() != null) inv.setMaxNights(request.getMaxNights());
        if (request.getClosedToArrival() != null) inv.setClosedToArrival(request.getClosedToArrival());
        if (request.getClosedToDeparture() != null) inv.setClosedToDeparture(request.getClosedToDeparture());
        // Recalculate available = total - booked - blocked
        if (request.getAvailableRooms() != null) {
            inv.setAvailableRooms(request.getAvailableRooms());
        } else {
            int available = inv.getTotalRooms() - inv.getBookedRooms() - inv.getBlockedRooms();
            inv.setAvailableRooms(Math.max(0, available));
        }

        inventoryRepository.save(inv);
        auditService.log(adminId, "UPDATE_INVENTORY", "RoomInventory", inv.getId(), null, inv, null, null);
        return inv;
    }

    @Transactional
    public int bulkUpdateInventory(UUID roomTypeId, String fromStr, String toStr,
                                    InventoryUpdateRequest request, UUID adminId) {
        LocalDate from = LocalDate.parse(fromStr);
        LocalDate to = LocalDate.parse(toStr);
        List<RoomInventory> invList = inventoryRepository
                .findByRoomTypeIdAndDateBetweenOrderByDateAsc(roomTypeId, from, to);
        for (RoomInventory inv : invList) {
            if (request.getAdminOverridePrice() != null) inv.setAdminOverridePrice(request.getAdminOverridePrice());
            if (request.getMinPriceFloor() != null) inv.setMinPriceFloor(request.getMinPriceFloor());
            if (request.getMaxPriceCeiling() != null) inv.setMaxPriceCeiling(request.getMaxPriceCeiling());
            if (request.getIsBlocked() != null) inv.setIsBlocked(request.getIsBlocked());
            if (request.getBlockReason() != null) inv.setBlockReason(request.getBlockReason());
            if (request.getMinNights() != null) inv.setMinNights(request.getMinNights());
            if (request.getMaxNights() != null) inv.setMaxNights(request.getMaxNights());
            if (request.getClosedToArrival() != null) inv.setClosedToArrival(request.getClosedToArrival());
            if (request.getClosedToDeparture() != null) inv.setClosedToDeparture(request.getClosedToDeparture());
            // Recalculate available = total - booked - blocked
            if (request.getAvailableRooms() != null) {
                inv.setAvailableRooms(request.getAvailableRooms());
            } else {
                int available = inv.getTotalRooms() - inv.getBookedRooms() - inv.getBlockedRooms();
                inv.setAvailableRooms(Math.max(0, available));
            }
        }
        inventoryRepository.saveAll(invList);
        auditService.log(adminId, "BULK_UPDATE_INVENTORY", "RoomInventory", roomTypeId, null,
                Map.of("from", fromStr, "to", toStr, "count", invList.size()), null, null);
        return invList.size();
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private void syncHotelTotalRooms(UUID hotelId) {
        int count = (int) roomRepository.countByHotelId(hotelId);
        hotelRepository.findById(hotelId).ifPresent(h -> {
            h.setTotalRooms(count);
            hotelRepository.save(h);
        });
    }
}
