package com.makemycrip.pricing.repository;

import com.makemycrip.pricing.entity.PricingAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PricingAuditLogRepository extends JpaRepository<PricingAuditLog, UUID> {
}
