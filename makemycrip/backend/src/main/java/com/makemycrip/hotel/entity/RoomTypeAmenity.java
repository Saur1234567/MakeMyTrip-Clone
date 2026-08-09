package com.makemycrip.hotel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "room_type_amenities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTypeAmenity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Column(name = "amenity_name", nullable = false)
    private String amenityName;

    @Column(name = "amenity_icon")
    private String amenityIcon;

    @Column(name = "is_complimentary")
    @Builder.Default
    private Boolean isComplimentary = true;
}
