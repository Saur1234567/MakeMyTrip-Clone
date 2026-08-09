package com.makemycrip.hotel.entity;

import com.makemycrip.hotel.enums.NearbyPlaceType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "hotel_nearby_places")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelNearbyPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(name = "place_name")
    private String placeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "place_type")
    private NearbyPlaceType placeType;

    @Column(name = "distance_km", precision = 5, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "travel_time_minutes")
    private Integer travelTimeMinutes;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;
}
