package com.makemycrip.hotel.service;

import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.dto.*;
import com.makemycrip.hotel.entity.*;
import com.makemycrip.hotel.enums.HotelStatus;
import com.makemycrip.hotel.enums.ReviewStatus;
import com.makemycrip.hotel.repository.*;
import com.makemycrip.pricing.dto.PricingContext;
import com.makemycrip.pricing.dto.PricingResult;
import com.makemycrip.pricing.engine.PricingEngineService;
import com.makemycrip.user.entity.User;
import com.makemycrip.user.enums.DeviceType;
import com.makemycrip.user.enums.LoyaltyTier;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HotelService {

    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomInventoryRepository inventoryRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final WishlistRepository wishlistRepository;
    private final PricingEngineService pricingEngine;

    @Cacheable(
        value = "search",
        key = "#req.city + '-' + #req.checkIn + '-' + #req.checkOut + '-' + #req.adults"
            + " + '-' + #req.children + '-' + #req.rooms + '-' + #req.sortBy + '-' + #req.page"
            + " + '-' + #req.minPrice + '-' + #req.maxPrice"
            + " + '-' + (#req.starRatings != null ? #req.starRatings.toString() : '')"
            + " + '-' + (#req.hotelTypes != null ? #req.hotelTypes.toString() : '')"
            + " + '-' + (#req.amenities != null ? #req.amenities.toString() : '')"
            + " + '-' + #req.freeCancellation + '-' + #req.minGuestRating"
    )
    public Page<HotelSummaryDto> search(HotelSearchRequest req, String userId) {
        Pageable pageable = buildPageable(req);
        Page<Hotel> hotels = hotelRepository.findAll(HotelSpecification.buildSearchSpec(req), pageable);

        UUID uid = toUserId(userId);
        Set<UUID> wishlistedIds = uid != null ? wishlistRepository.findHotelIdsByUserId(uid) : Set.of();

        List<HotelSummaryDto> mapped = hotels.stream().map(hotel -> {
            Double rating = reviewRepository.findAverageRatingByHotelId(hotel.getId());
            Long reviewCount = reviewRepository.countApprovedByHotelId(hotel.getId());
            String primaryImage = hotel.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary())).findFirst()
                    .map(HotelImage::getImageUrl)
                    .orElse(hotel.getImages().isEmpty() ? null : hotel.getImages().get(0).getImageUrl());
            List<String> topAmenities = hotel.getAmenities().stream()
                    .filter(a -> Boolean.TRUE.equals(a.getIsActive()))
                    .limit(5).map(HotelAmenity::getAmenityName).collect(Collectors.toList());

            // Find cheapest available room type and compute pricing via engine
            List<RoomType> roomTypes = roomTypeRepository.findAvailableByHotelId(hotel.getId());
            BigDecimal startingPrice = BigDecimal.ZERO;
            BigDecimal originalPrice = BigDecimal.ZERO;
            BigDecimal taxAmount = BigDecimal.ZERO;
            Integer minAvailableRooms = 0;

            Optional<RoomType> cheapestRoom = roomTypes.stream()
                    .filter(rt -> rt.getBasePrice() != null)
                    .min(Comparator.comparing(RoomType::getBasePrice));

            if (cheapestRoom.isPresent()) {
                RoomType rt = cheapestRoom.get();
                // Get available rooms for this room type
                Integer avail = inventoryRepository.findMinAvailableRooms(
                        rt.getId(), req.getCheckIn(), req.getCheckOut());
                minAvailableRooms = avail != null ? avail : 0;

                // Use pricing engine for accurate price
                try {
                    PricingContext ctx = PricingContext.builder()
                            .roomTypeId(rt.getId())
                            .checkIn(req.getCheckIn())
                            .checkOut(req.getCheckOut())
                            .adults(req.getAdults())
                            .children(req.getChildren())
                            .userId(uid)
                            .deviceType(DeviceType.DESKTOP)
                            .loyaltyTier(LoyaltyTier.BRONZE)
                            .build();
                    PricingResult pricing = pricingEngine.calculatePrice(ctx);
                    startingPrice = pricing.getPricePerNight() != null ? pricing.getPricePerNight() : rt.getBasePrice();
                    originalPrice = rt.getBasePrice(); // undiscounted base price
                    taxAmount = pricing.getTotalTax() != null ? pricing.getTotalTax() : BigDecimal.ZERO;
                } catch (Exception e) {
                    log.warn("Pricing engine failed for hotel {} room {}: {}", hotel.getId(), rt.getId(), e.getMessage());
                    startingPrice = rt.getBasePrice();
                    originalPrice = rt.getBasePrice();
                }
            }

            return HotelSummaryDto.builder()
                    .id(hotel.getId())
                    .name(hotel.getName())
                    .slug(hotel.getSlug())
                    .shortDescription(hotel.getShortDescription())
                    .hotelType(hotel.getHotelType() != null ? hotel.getHotelType().name() : null)
                    .starRating(hotel.getStarRating())
                    .city(hotel.getCity())
                    .neighborhood(hotel.getNeighborhood())
                    .addressLine1(hotel.getAddressLine1())
                    .latitude(hotel.getLatitude())
                    .longitude(hotel.getLongitude())
                    .distanceFromCityCenter(hotel.getDistanceFromCityCenter())
                    .guestRating(rating)
                    .reviewCount(reviewCount)
                    .startingPrice(startingPrice)
                    .originalPrice(originalPrice)
                    .taxAmount(taxAmount)
                    .primaryImageUrl(primaryImage)
                    .topAmenities(topAmenities)
                    .isFeatured(hotel.getIsFeatured())
                    .freeCancellation(hotel.getCancellationPolicy() != null &&
                            (hotel.getCancellationPolicy().name().equals("FLEXIBLE") ||
                             hotel.getCancellationPolicy().name().equals("MODERATE")))
                    .availableRooms(minAvailableRooms)
                    .isWishlisted(wishlistedIds.contains(hotel.getId()))
                    .build();
        }).collect(Collectors.toList());

        // Apply in-memory price sort since startingPrice is computed (not a DB column)
        if ("PRICE_ASC".equals(req.getSortBy())) {
            mapped.sort(Comparator.comparing(
                dto -> dto.getStartingPrice() != null ? dto.getStartingPrice() : BigDecimal.ZERO));
        } else if ("PRICE_DESC".equals(req.getSortBy())) {
            mapped.sort(Comparator.comparing(
                (HotelSummaryDto dto) -> dto.getStartingPrice() != null ? dto.getStartingPrice() : BigDecimal.ZERO
            ).reversed());
        }

        return new PageImpl<>(mapped, pageable, hotels.getTotalElements());
    }

    @Cacheable(value = "hotels", key = "#slug")
    public HotelDetailDto getBySlug(String slug, String userId) {
        Hotel hotel = hotelRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found: " + slug));
        return mapToDetail(hotel, userId);
    }

    public HotelDetailDto getById(UUID id, String userId) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found: " + id));
        return mapToDetail(hotel, userId);
    }

    public List<RoomTypeDto> getAvailableRooms(UUID hotelId, RoomAvailabilityRequest req, String userId) {
        // Validate date range
        if (req.getCheckIn() == null || req.getCheckOut() == null) {
            log.warn("getAvailableRooms called with null dates for hotel {}", hotelId);
            return Collections.emptyList();
        }
        if (!req.getCheckOut().isAfter(req.getCheckIn())) {
            log.warn("getAvailableRooms: checkOut {} is not after checkIn {} for hotel {}",
                    req.getCheckOut(), req.getCheckIn(), hotelId);
            return Collections.emptyList();
        }

        List<RoomType> roomTypes = roomTypeRepository.findAvailableByHotelId(hotelId);
        if (roomTypes.isEmpty()) {
            log.info("No active/bookable room types found for hotel {}", hotelId);
            return Collections.emptyList();
        }

        DeviceType deviceType = DeviceType.DESKTOP;
        LoyaltyTier resolvedTier = LoyaltyTier.BRONZE;
        UUID uidForRooms = toUserId(userId);
        if (uidForRooms != null) {
            Optional<User> user = userRepository.findById(uidForRooms);
            if (user.isPresent()) resolvedTier = user.get().getLoyaltyTier();
        }
        final LoyaltyTier loyaltyTier = resolvedTier;

        return roomTypes.stream().map(rt -> {
            try {
                Integer available = inventoryRepository.findMinAvailableRooms(
                        rt.getId(), req.getCheckIn(), req.getCheckOut());

                // If no inventory rows exist for this date range, the room type has no
                // explicit inventory records — treat it as available with a default capacity
                // derived from the room category so the room is still shown to users.
                if (available == null) {
                    log.info("No inventory rows found for room type {} between {} and {}. " +
                             "Falling back to default capacity.", rt.getId(), req.getCheckIn(), req.getCheckOut());
                    available = defaultCapacity(rt);
                }

                if (available <= 0) {
                    log.debug("Room type {} has 0 available rooms for {} to {}", rt.getId(), req.getCheckIn(), req.getCheckOut());
                    return null;
                }

                PricingContext ctx = PricingContext.builder()
                        .roomTypeId(rt.getId())
                        .checkIn(req.getCheckIn())
                        .checkOut(req.getCheckOut())
                        .adults(req.getAdults())
                        .children(req.getChildren())
                        .userId(uidForRooms)
                        .deviceType(deviceType)
                        .loyaltyTier(loyaltyTier)
                        .build();

                PricingResult pricing = pricingEngine.calculatePrice(ctx);

                List<RoomTypeDto.AmenityDto> amenities = rt.getAmenities().stream()
                        .map(a -> RoomTypeDto.AmenityDto.builder()
                                .amenityName(a.getAmenityName())
                                .amenityIcon(a.getAmenityIcon())
                                .isComplimentary(a.getIsComplimentary())
                                .build())
                        .collect(Collectors.toList());

                List<RoomTypeDto.ImageDto> images = rt.getImages().stream()
                        .sorted(Comparator.comparingInt(RoomTypeImage::getSortOrder))
                        .map(i -> RoomTypeDto.ImageDto.builder()
                                .imageUrl(i.getImageUrl())
                                .thumbnailUrl(i.getThumbnailUrl())
                                .isPrimary(i.getIsPrimary())
                                .build())
                        .collect(Collectors.toList());

                List<RoomTypeDto.AdjustmentDto> adjustmentDtos = pricing.getAdjustments().stream()
                        .map(a -> RoomTypeDto.AdjustmentDto.builder()
                                .name(a.getName()).type(a.getType()).amount(a.getAmount()).build())
                        .collect(Collectors.toList());

                List<RoomTypeDto.TaxDto> taxDtos = pricing.getTaxBreakdown().stream()
                        .map(t -> RoomTypeDto.TaxDto.builder()
                                .name(t.getName()).amount(t.getAmount()).build())
                        .collect(Collectors.toList());

                return RoomTypeDto.builder()
                        .id(rt.getId())
                        .name(rt.getName())
                        .description(rt.getDescription())
                        .roomCategory(rt.getRoomCategory() != null ? rt.getRoomCategory().name() : null)
                        .bedType(rt.getBedType())
                        .maxOccupancy(rt.getMaxOccupancy())
                        .maxAdults(rt.getMaxAdults())
                        .maxChildren(rt.getMaxChildren())
                        .roomSizeSqft(rt.getRoomSizeSqft())
                        .viewType(rt.getViewType() != null ? rt.getViewType().name() : null)
                        .basePrice(rt.getBasePrice())
                        .discountedPrice(pricing.getPricePerNight())
                        .extraAdultCharge(rt.getExtraAdultCharge())
                        .extraChildCharge(rt.getExtraChildCharge())
                        .availableRooms(available)
                        .amenities(amenities)
                        .images(images)
                        .priceBreakdown(RoomTypeDto.PriceBreakdownDto.builder()
                                .basePrice(pricing.getBasePrice())
                                .adjustments(adjustmentDtos)
                                .subtotal(pricing.getTotalForStay())
                                .taxes(taxDtos)
                                .totalTax(pricing.getTotalTax())
                                .convenienceFee(pricing.getConvenienceFee())
                                .grandTotal(pricing.getGrandTotal())
                                .build())
                        .build();
            } catch (Exception e) {
                log.error("Error computing availability for room type {} in hotel {}: {}",
                        rt.getId(), hotelId, e.getMessage(), e);
                return null;
            }
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    /**
     * Returns a sensible default room capacity when no inventory rows exist for a date range.
     * This prevents rooms from being incorrectly hidden when inventory hasn't been seeded
     * for future dates beyond the initial seed window.
     */
    private int defaultCapacity(RoomType rt) {
        if (rt.getRoomCategory() == null) return 10;
        return switch (rt.getRoomCategory().name()) {
            case "VILLA"  -> 5;
            case "SUITE"  -> 8;
            case "DELUXE" -> 15;
            default       -> 20;
        };
    }

    private HotelDetailDto mapToDetail(Hotel hotel, String userId) {
        Double rating = reviewRepository.findAverageRatingByHotelId(hotel.getId());
        Long reviewCount = reviewRepository.countApprovedByHotelId(hotel.getId());

        List<HotelDetailDto.HotelAmenityDto> allAmenities = hotel.getAmenities().stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsActive()))
                .map(a -> HotelDetailDto.HotelAmenityDto.builder()
                        .id(a.getId())
                        .amenityName(a.getAmenityName())
                        .amenityIcon(a.getAmenityIcon())
                        .category(a.getCategory())
                        .isPaid(a.getIsPaid())
                        .priceInfo(a.getPriceInfo())
                        .build())
                .collect(Collectors.toList());

        Map<String, List<HotelDetailDto.HotelAmenityDto>> amenitiesByCategory = allAmenities.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCategory() != null ? a.getCategory() : "General"
                ));

        List<HotelDetailDto.HotelImageDto> imageDtos = hotel.getImages().stream()
                .sorted(Comparator.comparingInt(HotelImage::getSortOrder))
                .map(i -> HotelDetailDto.HotelImageDto.builder()
                        .id(i.getId())
                        .imageUrl(i.getImageUrl())
                        .thumbnailUrl(i.getThumbnailUrl())
                        .caption(i.getCaption())
                        .category(i.getCategory() != null ? i.getCategory().name() : null)
                        .sortOrder(i.getSortOrder())
                        .isPrimary(i.getIsPrimary())
                        .build())
                .collect(Collectors.toList());

        List<HotelDetailDto.HotelPolicyDto> policyDtos = hotel.getPolicies().stream()
                .sorted(Comparator.comparingInt(HotelPolicy::getSortOrder))
                .map(p -> HotelDetailDto.HotelPolicyDto.builder()
                        .id(p.getId())
                        .policyType(p.getPolicyType())
                        .title(p.getTitle())
                        .description(p.getDescription())
                        .build())
                .collect(Collectors.toList());

        List<HotelDetailDto.HotelNearbyPlaceDto> nearbyDtos = hotel.getNearbyPlaces().stream()
                .map(n -> HotelDetailDto.HotelNearbyPlaceDto.builder()
                        .id(n.getId())
                        .placeName(n.getPlaceName())
                        .placeType(n.getPlaceType() != null ? n.getPlaceType().name() : null)
                        .distanceKm(n.getDistanceKm())
                        .travelTimeMinutes(n.getTravelTimeMinutes())
                        .build())
                .collect(Collectors.toList());

        List<HotelDetailDto.HotelFaqDto> faqDtos = hotel.getFaqs().stream()
                .filter(f -> Boolean.TRUE.equals(f.getIsActive()))
                .sorted(Comparator.comparingInt(HotelFaq::getSortOrder))
                .map(f -> HotelDetailDto.HotelFaqDto.builder()
                        .id(f.getId())
                        .question(f.getQuestion()).answer(f.getAnswer()).build())
                .collect(Collectors.toList());

        UUID uidForWishlist = toUserId(userId);
        boolean isWishlisted = uidForWishlist != null &&
                wishlistRepository.existsByUserIdAndHotelId(uidForWishlist, hotel.getId());

        return HotelDetailDto.builder()
                .id(hotel.getId())
                .name(hotel.getName())
                .slug(hotel.getSlug())
                .description(hotel.getDescription())
                .shortDescription(hotel.getShortDescription())
                .hotelType(hotel.getHotelType() != null ? hotel.getHotelType().name() : null)
                .starRating(hotel.getStarRating())
                .checkinTime(hotel.getCheckinTime())
                .checkoutTime(hotel.getCheckoutTime())
                .totalFloors(hotel.getTotalFloors())
                .totalRooms(hotel.getTotalRooms())
                .yearBuilt(hotel.getYearBuilt())
                .yearRenovated(hotel.getYearRenovated())
                .addressLine1(hotel.getAddressLine1())
                .addressLine2(hotel.getAddressLine2())
                .city(hotel.getCity())
                .state(hotel.getState())
                .country(hotel.getCountry())
                .pincode(hotel.getPincode())
                .latitude(hotel.getLatitude())
                .longitude(hotel.getLongitude())
                .neighborhood(hotel.getNeighborhood())
                .locality(hotel.getNeighborhood())
                .status(hotel.getStatus() != null ? hotel.getStatus().name() : null)
                .distanceFromAirport(hotel.getDistanceFromAirport())
                .distanceFromCityCenter(hotel.getDistanceFromCityCenter())
                .primaryPhone(hotel.getPrimaryPhone())
                .secondaryPhone(hotel.getSecondaryPhone())
                .email(hotel.getEmail())
                .website(hotel.getWebsite())
                .facebookUrl(hotel.getFacebookUrl())
                .instagramUrl(hotel.getInstagramUrl())
                .panNumber(hotel.getPanNumber())
                .cancellationPolicy(hotel.getCancellationPolicy() != null ? hotel.getCancellationPolicy().name() : null)
                .cancellationPolicyDetails(hotel.getCancellationPolicyDetails())
                .petsAllowed(hotel.getPetsAllowed())
                .smokingAllowed(hotel.getSmokingAllowed())
                .eventsAllowed(hotel.getEventsAllowed())
                .minimumAgeCheckin(hotel.getMinimumAgeCheckin())
                .isFeatured(hotel.getIsFeatured())
                .isVerified(hotel.getIsVerified())
                .guestRating(rating)
                .reviewCount(reviewCount)
                .images(imageDtos)
                .amenities(allAmenities)
                .amenitiesByCategory(amenitiesByCategory)
                .policies(policyDtos)
                .nearbyPlaces(nearbyDtos)
                .faqs(faqDtos)
                .isWishlisted(isWishlisted)
                .build();
    }

    private BigDecimal getStartingPrice(UUID hotelId, HotelSearchRequest req) {
        List<RoomType> roomTypes = roomTypeRepository.findAvailableByHotelId(hotelId);
        return roomTypes.stream()
                .map(RoomType::getBasePrice)
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }

    private UUID toUserId(String userId) {
        if (userId == null || userId.isBlank() || userId.equals("anonymousUser")) return null;
        try { return UUID.fromString(userId); } catch (IllegalArgumentException e) { return null; }
    }

    private Pageable buildPageable(HotelSearchRequest req) {
        // PRICE_ASC / PRICE_DESC are handled via in-memory sort after pricing engine runs.
        // Use a stable default DB sort for those cases.
        Sort sort = switch (req.getSortBy()) {
            case "PRICE_ASC", "PRICE_DESC" -> Sort.by("isFeatured").descending().and(Sort.by("id").ascending());
            case "RATING" -> Sort.by("starRating").descending();
            default -> Sort.by("isFeatured").descending().and(Sort.by("starRating").descending());
        };
        return PageRequest.of(req.getPage(), req.getSize(), sort);
    }
}
