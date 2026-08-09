package com.makemycrip.booking.entity;

import com.makemycrip.booking.enums.GuestType;
import com.makemycrip.user.enums.IdType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "booking_guests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "guest_type")
    @Builder.Default
    private GuestType guestType = GuestType.ADULT;

    @Column(name = "is_primary")
    @Builder.Default
    private Boolean isPrimary = false;

    private String title;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    private String email;
    private String phone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private String nationality;

    @Enumerated(EnumType.STRING)
    @Column(name = "id_type")
    private IdType idType;

    @Column(name = "id_number_encrypted")
    private String idNumberEncrypted;

    @Column(name = "added_at", updatable = false)
    private LocalDateTime addedAt;

    @Column(name = "added_by")
    private UUID addedBy;

    @PrePersist
    public void prePersist() {
        addedAt = LocalDateTime.now();
    }
}
