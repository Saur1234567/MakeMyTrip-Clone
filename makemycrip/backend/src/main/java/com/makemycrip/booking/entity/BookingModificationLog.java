package com.makemycrip.booking.entity;

import com.makemycrip.booking.enums.ModificationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "booking_modification_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingModificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "modified_by")
    private UUID modifiedBy;

    @Column(name = "modified_by_role")
    private String modifiedByRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "modification_type")
    private ModificationType modificationType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_value", columnDefinition = "jsonb")
    private String oldValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_value", columnDefinition = "jsonb")
    private String newValue;

    private String reason;

    @Column(name = "modified_at", updatable = false)
    private LocalDateTime modifiedAt;

    @PrePersist
    public void prePersist() {
        modifiedAt = LocalDateTime.now();
    }
}
