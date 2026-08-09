package com.makemycrip.pricing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tax_fees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxFee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "fee_name", nullable = false)
    private String feeName;

    /** FLAT or PERCENT */
    @Column(name = "fee_type", nullable = false)
    private String feeType;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    /** GLOBAL or HOTEL */
    @Column(name = "scope", nullable = false)
    @Builder.Default
    private String scope = "GLOBAL";

    @Column(name = "hotel_id")
    private UUID hotelId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
