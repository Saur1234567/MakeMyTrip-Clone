package com.makemycrip.hotel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "hotel_amenities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelAmenity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    private String category;

    @Column(name = "amenity_name", nullable = false)
    private String amenityName;

    @Column(name = "amenity_icon")
    private String amenityIcon;

    @Column(name = "is_paid")
    @Builder.Default
    private Boolean isPaid = false;

    @Column(name = "price_info")
    private String priceInfo;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
