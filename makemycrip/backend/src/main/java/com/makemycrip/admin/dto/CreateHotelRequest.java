package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateHotelRequest {

    @NotBlank(message = "Hotel name is required")
    private String name;

    private String description;
    private String shortDescription;
    private String hotelType;

    @DecimalMin(value = "1.0") @DecimalMax(value = "5.0")
    private BigDecimal starRating;

    @NotBlank(message = "City is required")
    private String city;

    private String state;
    private String country;
    private String pincode;

    /** Accepts both "addressLine1" (internal) and "address" (frontend form) */
    @JsonAlias("address")
    private String addressLine1;

    private BigDecimal latitude;
    private BigDecimal longitude;

    /** Accepts both "neighborhood" (internal) and "locality" (frontend form) */
    @JsonAlias("locality")
    private String neighborhood;

    private BigDecimal distanceFromAirport;
    private BigDecimal distanceFromCityCenter;

    /** Accepts both "primaryPhone" (internal) and "phone" (frontend form) */
    @JsonAlias("phone")
    private String primaryPhone;

    private String email;
    private String gstin;
    private String cancellationPolicy;
    private Boolean petsAllowed;
    private Boolean smokingAllowed;
    private Integer minimumAgeCheckin;

    /** Accepts both "checkinTime" (internal) and "checkInTime" (frontend form) */
    @JsonAlias("checkInTime")
    private String checkinTime;

    /** Accepts both "checkoutTime" (internal) and "checkOutTime" (frontend form) */
    @JsonAlias("checkOutTime")
    private String checkoutTime;

    private Integer totalFloors;
    private Integer totalRooms;
    private Integer yearBuilt;

    /** Base price sent from the frontend form (stored on the first room type, not on the hotel itself) */
    private BigDecimal basePrice;
}
