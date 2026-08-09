package com.makemycrip.hotel.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReviewDto {
    private UUID id;
    private UUID userId;
    private String userFirstName;
    private String userLastName;
    private String userProfilePicture;
    private BigDecimal overallRating;
    private BigDecimal cleanlinessRating;
    private BigDecimal serviceRating;
    private BigDecimal locationRating;
    private BigDecimal valueRating;
    private String title;
    private String reviewText;
    private String travelType;
    private String adminResponse;
    private LocalDateTime adminRespondedAt;
    private Integer helpfulCount;
    private LocalDateTime createdAt;
}
