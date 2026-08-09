package com.makemycrip.booking.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InitiateBookingRequest {

    @NotNull(message = "Room type ID is required")
    private UUID roomTypeId;

    /**
     * Check-in date. NOT annotated with @Future because same-day check-in is a
     * valid use-case and the @Future constraint rejects today's date, causing a
     * 400 "malformed request" error even when the payload is perfectly valid.
     * Business-level date validation (checkOut > checkIn, checkIn >= today) is
     * performed inside BookingService.initiateBooking().
     */
    @NotNull(message = "Check-in date is required")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkIn;

    @NotNull(message = "Check-out date is required")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkOut;

    @Min(value = 1, message = "At least 1 adult required")
    private int adults = 1;

    private int children = 0;
    private int infants = 0;

    private String couponCode;
    private String specialRequests;
    private String arrivalTime;

    /** Primary guest details — collected from the booking form */
    @Valid
    private PrimaryGuestRequest primaryGuest;

    /** Additional guests (adults-1 entries) */
    @Valid
    private List<GuestRequest> additionalGuests;

    /**
     * Optional add-ons selected by the user on the booking initiate page.
     * Each entry carries the add-on type key and the quantity chosen.
     */
    private List<AddOnRequest> addOns;

    @Data
    public static class PrimaryGuestRequest {
        @NotBlank(message = "First name is required")
        private String firstName;
        @NotBlank(message = "Last name is required")
        private String lastName;
        @NotBlank(message = "Email is required")
        private String email;
        private String phone;
    }

    @Data
    public static class AddOnRequest {
        /** Matches AddOnType enum values: BREAKFAST, AIRPORT_TRANSFER, BICYCLE_RENTAL, DINNER, etc. */
        @NotBlank(message = "Add-on type is required")
        private String type;

        @Min(value = 1, message = "Add-on quantity must be at least 1")
        private int quantity = 1;
    }
}
