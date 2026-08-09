package com.makemycrip.hotel.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Request DTO for querying available room types for a specific hotel.
 * Unlike {@link HotelSearchRequest}, this does NOT require a city field
 * (the hotel is already identified by its ID in the path) and does NOT
 * enforce @Future on checkIn so that same-day check-in is allowed.
 */
@Data
public class RoomAvailabilityRequest {

    @NotNull(message = "Check-in date is required")
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
}
