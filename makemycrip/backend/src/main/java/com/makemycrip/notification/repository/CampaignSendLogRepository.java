package com.makemycrip.notification.repository;

import com.makemycrip.notification.entity.CampaignSendLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CampaignSendLogRepository extends JpaRepository<CampaignSendLog, UUID> {
    long countByCampaignId(UUID campaignId);
    boolean existsByCampaignIdAndUserId(UUID campaignId, UUID userId);
}
