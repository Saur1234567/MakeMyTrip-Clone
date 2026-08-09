package com.makemycrip.hotel.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class HotelSearchRequest {

    @NotBlank(message = "City is required")
    private String city;

    @NotNull(message = "Check-in date is required")
    @Future(message = "Check-in date must be in the future")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkIn;

    @NotNull(message = "Check-out date is required")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkOut;

    @Min(value = 1, message = "At least 1 adult required")
    private int adults = 1;

    private int children = 0;

    @Min(value = 1, message = "At least 1 room required")
    private int rooms = 1;

    // Filters
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private List<Integer> starRatings;
    private List<String> hotelTypes;
    private List<String> amenities;
    private Double minGuestRating;
    private Boolean freeCancellation;

    // Sort
    private String sortBy = "POPULARITY"; // POPULARITY, PRICE_ASC, PRICE_DESC, RATING, DISTANCE

    // Pagination
    private int page = 0;
    private int size = 20;
}
