package com.makemycrip.hotel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "room_inventory")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "room_type_id", nullable = false)
    private UUID roomTypeId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "total_rooms", nullable = false)
    private Integer totalRooms;

    @Column(name = "available_rooms", nullable = false)
    private Integer availableRooms;

    @Column(name = "booked_rooms")
    @Builder.Default
    private Integer bookedRooms = 0;

    @Column(name = "blocked_rooms")
    @Builder.Default
    private Integer blockedRooms = 0;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "admin_override_price", precision = 12, scale = 2)
    private BigDecimal adminOverridePrice;

    @Column(name = "final_price", precision = 12, scale = 2)
    private BigDecimal finalPrice;

    @Column(name = "min_price_floor", precision = 12, scale = 2)
    private BigDecimal minPriceFloor;

    @Column(name = "max_price_ceiling", precision = 12, scale = 2)
    private BigDecimal maxPriceCeiling;

    @Column(name = "is_blocked")
    @Builder.Default
    private Boolean isBlocked = false;

    @Column(name = "block_reason")
    private String blockReason;

    @Column(name = "min_nights")
    @Builder.Default
    private Integer minNights = 1;

    @Column(name = "max_nights")
    @Builder.Default
    private Integer maxNights = 30;

    @Column(name = "closed_to_arrival")
    @Builder.Default
    private Boolean closedToArrival = false;

    @Column(name = "closed_to_departure")
    @Builder.Default
    private Boolean closedToDeparture = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    public double getOccupancyPercent() {
        if (totalRooms == 0) return 100.0;
        return ((double) bookedRooms / totalRooms) * 100.0;
    }
}
