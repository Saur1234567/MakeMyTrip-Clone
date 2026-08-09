package com.makemycrip.payment.entity;

import com.makemycrip.payment.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refunds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "stripe_refund_id")
    private String stripeRefundId;

    @Column(name = "refund_reference", unique = true)
    private String refundReference;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    private String reason;

    @Enumerated(EnumType.STRING)
    private RefundStatus status;

    @Column(name = "initiated_by")
    private UUID initiatedBy;

    @Column(name = "initiated_by_role")
    private String initiatedByRole;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        if (refundReference == null) {
            refundReference = "REF" + System.currentTimeMillis();
        }
    }
}
