package com.makemycrip.notification.service;

import com.makemycrip.notification.dto.CampaignDto;
import com.makemycrip.notification.dto.CampaignRequest;
import com.makemycrip.notification.entity.Campaign;
import com.makemycrip.notification.entity.CampaignSendLog;
import com.makemycrip.notification.repository.CampaignRepository;
import com.makemycrip.notification.repository.CampaignSendLogRepository;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignSendLogRepository sendLogRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;

    @Transactional
    public CampaignDto createCampaign(CampaignRequest req, UUID createdBy) {
        Campaign campaign = Campaign.builder()
                .name(req.getName())
                .subject(req.getSubject())
                .body(req.getBody())
                .ctaText(req.getCtaText())
                .ctaUrl(req.getCtaUrl())
                .discountCode(req.getDiscountCode())
                .expiresAt(req.getExpiresAt())
                .targetType(req.getTargetType())
                .targetCities(req.getTargetCities())
                .targetUserIds(req.getTargetUserIds())
                .targetCondition(req.getTargetCondition())
                .conditionValue(req.getConditionValue())
                .scheduledAt(req.getScheduledAt())
                .status(req.getScheduledAt() != null ? "SCHEDULED" : "DRAFT")
                .createdBy(createdBy)
                .build();
        campaign = campaignRepository.save(campaign);
        return toDto(campaign);
    }

    public Page<CampaignDto> getCampaigns(int page, int size) {
        return campaignRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(this::toDto);
    }

    public CampaignDto getCampaign(UUID id) {
        return campaignRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new com.makemycrip.common.exception.ResourceNotFoundException("Campaign not found"));
    }

    @Transactional
    public CampaignDto sendCampaign(UUID campaignId, UUID adminId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new com.makemycrip.common.exception.ResourceNotFoundException("Campaign not found"));

        if ("SENT".equals(campaign.getStatus()) || "SENDING".equals(campaign.getStatus())) {
            throw new com.makemycrip.common.exception.BusinessLogicException("Campaign already sent or sending");
        }

        campaign.setStatus("SENDING");
        campaignRepository.save(campaign);

        List<User> targets = resolveTargets(campaign);
        int sent = 0;
        for (User user : targets) {
            if (sendLogRepository.existsByCampaignIdAndUserId(campaign.getId(), user.getId())) {
                continue; // already sent
            }
            try {
                notificationDispatcher.sendCampaignEmail(
                        user.getEmail(), user.getFirstName(), user.getId(),
                        campaign.getSubject(), campaign.getBody(),
                        campaign.getCtaText(), campaign.getCtaUrl(),
                        campaign.getDiscountCode());

                sendLogRepository.save(CampaignSendLog.builder()
                        .campaignId(campaign.getId())
                        .userId(user.getId())
                        .email(user.getEmail())
                        .build());
                sent++;
            } catch (Exception e) {
                log.error("Failed to send campaign {} to user {}: {}", campaignId, user.getId(), e.getMessage());
            }
        }

        campaign.setStatus("SENT");
        campaign.setSentAt(LocalDateTime.now());
        campaign.setTotalSent(sent);
        campaignRepository.save(campaign);

        log.info("Campaign {} sent to {} users", campaignId, sent);
        return toDto(campaign);
    }

    @Transactional
    public void cancelCampaign(UUID campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new com.makemycrip.common.exception.ResourceNotFoundException("Campaign not found"));
        if ("SENT".equals(campaign.getStatus())) {
            throw new com.makemycrip.common.exception.BusinessLogicException("Cannot cancel a sent campaign");
        }
        campaign.setStatus("CANCELLED");
        campaignRepository.save(campaign);
    }

    /** Runs every minute — sends scheduled campaigns whose time has come */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processScheduledCampaigns() {
        List<Campaign> due = campaignRepository.findByStatusAndScheduledAtBefore("SCHEDULED", LocalDateTime.now());
        for (Campaign campaign : due) {
            try {
                sendCampaign(campaign.getId(), campaign.getCreatedBy());
            } catch (Exception e) {
                log.error("Failed to auto-send scheduled campaign {}: {}", campaign.getId(), e.getMessage());
            }
        }
    }

    private List<User> resolveTargets(Campaign campaign) {
        String targetType = campaign.getTargetType();
        if (targetType == null) return List.of();

        return switch (targetType.toUpperCase()) {
            case "ALL" -> userRepository.findAll();

            case "BY_USER_ID" -> {
                if (campaign.getTargetUserIds() == null || campaign.getTargetUserIds().isBlank()) yield List.of();
                List<UUID> ids = Arrays.stream(campaign.getTargetUserIds().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(s -> {
                            try { return UUID.fromString(s); } catch (Exception e) { return null; }
                        })
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                yield userRepository.findAllById(ids);
            }

            case "BY_CITY" -> {
                if (campaign.getTargetCities() == null || campaign.getTargetCities().isBlank()) yield List.of();
                List<String> cities = Arrays.stream(campaign.getTargetCities().split(","))
                        .map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toList());
                yield userRepository.findUsersWhoBookedInCities(cities);
            }

            case "CONDITION_BASED" -> resolveConditionTargets(campaign);

            default -> List.of();
        };
    }

    private List<User> resolveConditionTargets(Campaign campaign) {
        String condition = campaign.getTargetCondition();
        if (condition == null) return List.of();
        return switch (condition.toUpperCase()) {
            case "RETURNING_CUSTOMER" -> userRepository.findReturningCustomers();
            case "NEVER_BOOKED" -> userRepository.findUsersWhoNeverBooked();
            case "INACTIVE_X_DAYS" -> {
                int days = 30;
                try { days = Integer.parseInt(campaign.getConditionValue()); } catch (Exception ignored) {}
                yield userRepository.findInactiveUsers(LocalDateTime.now().minusDays(days));
            }
            case "UPCOMING_CHECKIN" -> {
                int daysAhead = 3;
                try { daysAhead = Integer.parseInt(campaign.getConditionValue()); } catch (Exception ignored) {}
                yield userRepository.findUsersWithUpcomingCheckin(
                        java.time.LocalDate.now(), java.time.LocalDate.now().plusDays(daysAhead));
            }
            default -> List.of();
        };
    }

    private CampaignDto toDto(Campaign c) {
        return CampaignDto.builder()
                .id(c.getId())
                .name(c.getName())
                .subject(c.getSubject())
                .body(c.getBody())
                .ctaText(c.getCtaText())
                .ctaUrl(c.getCtaUrl())
                .discountCode(c.getDiscountCode())
                .expiresAt(c.getExpiresAt())
                .status(c.getStatus())
                .targetType(c.getTargetType())
                .targetCities(c.getTargetCities())
                .targetUserIds(c.getTargetUserIds())
                .targetCondition(c.getTargetCondition())
                .conditionValue(c.getConditionValue())
                .scheduledAt(c.getScheduledAt())
                .sentAt(c.getSentAt())
                .totalSent(c.getTotalSent())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
