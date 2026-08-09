package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for updating a hotel. All fields are optional (null = no change).
 * @JsonIgnoreProperties ensures unknown fields (createdAt, updatedAt, etc.) are silently ignored.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateHotelRequest {

    // ── Basic Info ──────────────────────────────────────────────────────────────
    private String name;
    private String slug;
    private String description;
    private String shortDescription;
    private String hotelType;
    private BigDecimal starRating;
    private Integer totalFloors;
    private Integer totalRooms;
    private Integer yearBuilt;
    private Integer yearRenovated;

    // ── Timing ─────────────────────────────────────────────────────────────────
    @JsonAlias("checkInTime")
    private String checkinTime;

    @JsonAlias("checkOutTime")
    private String checkoutTime;

    private Integer minimumAgeCheckin;

    // ── Location ────────────────────────────────────────────────────────────────
    @JsonAlias("address")
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String country;
    private String pincode;
    private BigDecimal latitude;
    private BigDecimal longitude;

    @JsonAlias("locality")
    private String neighborhood;

    private BigDecimal distanceFromAirport;
    private BigDecimal distanceFromCityCenter;

    // ── Contact ─────────────────────────────────────────────────────────────────
    @JsonAlias("phone")
    private String primaryPhone;
    private String secondaryPhone;
    private String email;
    private String website;
    private String facebookUrl;
    private String instagramUrl;

    // ── Legal ───────────────────────────────────────────────────────────────────
    private String gstin;
    private String panNumber;

    // ── Policy ──────────────────────────────────────────────────────────────────
    private String cancellationPolicy;
    private String cancellationPolicyDetails;
    private Boolean petsAllowed;
    private Boolean smokingAllowed;
    private Boolean eventsAllowed;

    // ── Status ──────────────────────────────────────────────────────────────────
    private String status;
    private String statusReason;

    // ── Flags ───────────────────────────────────────────────────────────────────
    private Boolean isFeatured;
    private Boolean isVerified;

    // ── Manager ─────────────────────────────────────────────────────────────────
    private UUID managedBy;
}
