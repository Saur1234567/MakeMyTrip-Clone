package com.makemycrip.hotel.entity;

import com.makemycrip.hotel.enums.RoomCategory;
import com.makemycrip.hotel.enums.ViewType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "room_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_category")
    private RoomCategory roomCategory;

    @Column(name = "bed_type")
    private String bedType;

    @Column(name = "max_occupancy", nullable = false)
    @Builder.Default
    private Integer maxOccupancy = 2;

    @Column(name = "max_adults")
    @Builder.Default
    private Integer maxAdults = 2;

    @Column(name = "max_children")
    @Builder.Default
    private Integer maxChildren = 1;

    @Column(name = "room_size_sqft")
    private Integer roomSizeSqft;

    @Enumerated(EnumType.STRING)
    @Column(name = "view_type")
    private ViewType viewType;

    @Column(name = "bathroom_type")
    private String bathroomType;

    @Column(name = "floor_numbers")
    private String floorNumbers;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "extra_adult_charge", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal extraAdultCharge = BigDecimal.ZERO;

    @Column(name = "extra_child_charge", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal extraChildCharge = BigDecimal.ZERO;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_available_for_booking")
    @Builder.Default
    private Boolean isAvailableForBooking = true;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "roomType", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RoomTypeAmenity> amenities = new ArrayList<>();

    @OneToMany(mappedBy = "roomType", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RoomTypeImage> images = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
}
