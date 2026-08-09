package com.makemycrip.hotel.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ReviewRequest {

    @NotNull(message = "Booking ID is required")
    private UUID bookingId;

    @NotNull(message = "Overall rating is required")
    @DecimalMin(value = "1.0", message = "Rating must be at least 1.0")
    @DecimalMax(value = "5.0", message = "Rating must be at most 5.0")
    private BigDecimal overallRating;

    @DecimalMin(value = "1.0") @DecimalMax(value = "5.0")
    private BigDecimal cleanlinessRating;

    @DecimalMin(value = "1.0") @DecimalMax(value = "5.0")
    private BigDecimal serviceRating;

    @DecimalMin(value = "1.0") @DecimalMax(value = "5.0")
    private BigDecimal locationRating;

    @DecimalMin(value = "1.0") @DecimalMax(value = "5.0")
    private BigDecimal valueRating;

    @Size(max = 255)
    private String title;

    @Size(max = 2000, message = "Review text must be at most 2000 characters")
    private String reviewText;

    private String travelType;
}
