package com.makemycrip.notification.repository;

import com.makemycrip.notification.entity.Campaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
    Page<Campaign> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Campaign> findByStatusAndScheduledAtBefore(String status, LocalDateTime now);
}
