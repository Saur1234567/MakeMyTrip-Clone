package com.makemycrip.admin.service;

import com.makemycrip.admin.dto.*;
import com.makemycrip.common.audit.AuditService;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.common.util.EncryptionUtil;
import com.makemycrip.common.util.SlugUtil;
import com.makemycrip.hotel.dto.HotelDetailDto;
import com.makemycrip.hotel.dto.RoomTypeDto;
import com.makemycrip.hotel.entity.*;
import com.makemycrip.hotel.enums.*;
import com.makemycrip.hotel.repository.*;
import com.makemycrip.hotel.service.HotelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminHotelService {

    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomInventoryRepository inventoryRepository;
    private final RoomRepository roomRepository;
    private final HotelService hotelService;
    private final AuditService auditService;
    private final EncryptionUtil encryptionUtil;

    // ── Hotel CRUD ──────────────────────────────────────────────────────────────

    public Page<HotelDetailDto> listHotels(int page, int size, String city, String statusStr, String search) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<Hotel> hotels;
        if (search != null && !search.isBlank()) {
            hotels = hotelRepository.searchByNameOrCity(search, pageable);
        } else if (city != null && statusStr != null) {
            HotelStatus status = HotelStatus.valueOf(statusStr.toUpperCase());
            hotels = hotelRepository.findByCityIgnoreCaseAndStatus(city, status, pageable);
        } else {
            hotels = hotelRepository.findAll(pageable);
        }
        return hotels.map(h -> hotelService.getById(h.getId(), null));
    }

    public HotelDetailDto getHotelById(UUID hotelId) {
        return hotelService.getById(hotelId, null);
    }

    @Transactional
    public HotelDetailDto createHotel(CreateHotelRequest request, UUID adminId) {
        String baseSlug = SlugUtil.toSlug(request.getName() + "-" + request.getCity());
        String slug = hotelRepository.existsBySlug(baseSlug)
                ? SlugUtil.toUniqueSlug(request.getName() + "-" + request.getCity(),
                        String.valueOf(System.currentTimeMillis() % 10000))
                : baseSlug;

        Hotel hotel = Hotel.builder()
                .name(request.getName())
                .slug(slug)
                .description(request.getDescription())
                .shortDescription(request.getShortDescription())
                .hotelType(request.getHotelType() != null ? HotelType.valueOf(request.getHotelType()) : null)
                .starRating(request.getStarRating())
                .checkinTime(parseTime(request.getCheckinTime()))
                .checkoutTime(parseTime(request.getCheckoutTime()))
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry() != null ? request.getCountry() : "India")
                .pincode(request.getPincode())
                .addressLine1(request.getAddressLine1())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .neighborhood(request.getNeighborhood())
                .distanceFromAirport(request.getDistanceFromAirport())
                .distanceFromCityCenter(request.getDistanceFromCityCenter())
                .primaryPhone(request.getPrimaryPhone())
                .email(request.getEmail())
                .gstinEncrypted(request.getGstin() != null ? encryptionUtil.encrypt(request.getGstin()) : null)
                .cancellationPolicy(request.getCancellationPolicy() != null
                        ? CancellationPolicy.valueOf(request.getCancellationPolicy()) : CancellationPolicy.MODERATE)
                .petsAllowed(request.getPetsAllowed() != null ? request.getPetsAllowed() : false)
                .smokingAllowed(request.getSmokingAllowed() != null ? request.getSmokingAllowed() : false)
                .minimumAgeCheckin(request.getMinimumAgeCheckin() != null ? request.getMinimumAgeCheckin() : 18)
                .totalFloors(request.getTotalFloors())
                .totalRooms(request.getTotalRooms())
                .yearBuilt(request.getYearBuilt())
                .status(HotelStatus.ACTIVE)
                .createdBy(adminId)
                .build();

        Hotel saved = hotelRepository.save(hotel);
        auditService.log(adminId, "CREATE_HOTEL", "Hotel", saved.getId(), null, saved, null, null);
        log.info("Hotel created: hotelId={} by adminId={}", saved.getId(), adminId);
        return hotelService.getById(saved.getId(), null);
    }

    @Transactional
    public HotelDetailDto updateHotel(UUID hotelId, UpdateHotelRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        Hotel before = copyHotel(hotel);

        if (request.getName() != null) hotel.setName(request.getName());
        if (request.getDescription() != null) hotel.setDescription(request.getDescription());
        if (request.getShortDescription() != null) hotel.setShortDescription(request.getShortDescription());
        if (request.getHotelType() != null && !request.getHotelType().isBlank()) {
            try { hotel.setHotelType(HotelType.valueOf(request.getHotelType())); }
            catch (IllegalArgumentException e) { log.warn("Unknown hotelType: {}", request.getHotelType()); }
        }
        if (request.getStarRating() != null) hotel.setStarRating(request.getStarRating());
        if (request.getTotalFloors() != null) hotel.setTotalFloors(request.getTotalFloors());
        // totalRooms is auto-calculated from rooms table — never set manually
        if (request.getYearBuilt() != null) hotel.setYearBuilt(request.getYearBuilt());
        if (request.getYearRenovated() != null) hotel.setYearRenovated(request.getYearRenovated());
        if (request.getSlug() != null && !request.getSlug().isBlank()) hotel.setSlug(request.getSlug());
        if (request.getCheckinTime() != null && !request.getCheckinTime().isBlank())
            hotel.setCheckinTime(parseTime(request.getCheckinTime()));
        if (request.getCheckoutTime() != null && !request.getCheckoutTime().isBlank())
            hotel.setCheckoutTime(parseTime(request.getCheckoutTime()));
        if (request.getMinimumAgeCheckin() != null) hotel.setMinimumAgeCheckin(request.getMinimumAgeCheckin());
        if (request.getAddressLine1() != null) hotel.setAddressLine1(request.getAddressLine1());
        if (request.getAddressLine2() != null) hotel.setAddressLine2(request.getAddressLine2());
        if (request.getCity() != null) hotel.setCity(request.getCity());
        if (request.getState() != null) hotel.setState(request.getState());
        if (request.getCountry() != null) hotel.setCountry(request.getCountry());
        if (request.getPincode() != null) hotel.setPincode(request.getPincode());
        if (request.getLatitude() != null) hotel.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) hotel.setLongitude(request.getLongitude());
        if (request.getNeighborhood() != null) hotel.setNeighborhood(request.getNeighborhood());
        if (request.getDistanceFromAirport() != null) hotel.setDistanceFromAirport(request.getDistanceFromAirport());
        if (request.getDistanceFromCityCenter() != null) hotel.setDistanceFromCityCenter(request.getDistanceFromCityCenter());
        if (request.getPrimaryPhone() != null) hotel.setPrimaryPhone(request.getPrimaryPhone());
        if (request.getSecondaryPhone() != null) hotel.setSecondaryPhone(request.getSecondaryPhone());
        if (request.getEmail() != null) hotel.setEmail(request.getEmail());
        if (request.getWebsite() != null) hotel.setWebsite(request.getWebsite());
        if (request.getFacebookUrl() != null) hotel.setFacebookUrl(request.getFacebookUrl());
        if (request.getInstagramUrl() != null) hotel.setInstagramUrl(request.getInstagramUrl());
        if (request.getGstin() != null && !request.getGstin().isBlank())
            hotel.setGstinEncrypted(encryptionUtil.encrypt(request.getGstin()));
        if (request.getPanNumber() != null) hotel.setPanNumber(request.getPanNumber());
        if (request.getCancellationPolicy() != null && !request.getCancellationPolicy().isBlank()) {
            try { hotel.setCancellationPolicy(CancellationPolicy.valueOf(request.getCancellationPolicy())); }
            catch (IllegalArgumentException e) { log.warn("Unknown cancellationPolicy: {}", request.getCancellationPolicy()); }
        }
        if (request.getCancellationPolicyDetails() != null) hotel.setCancellationPolicyDetails(request.getCancellationPolicyDetails());
        if (request.getPetsAllowed() != null) hotel.setPetsAllowed(request.getPetsAllowed());
        if (request.getSmokingAllowed() != null) hotel.setSmokingAllowed(request.getSmokingAllowed());
        if (request.getEventsAllowed() != null) hotel.setEventsAllowed(request.getEventsAllowed());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                hotel.setStatus(HotelStatus.valueOf(request.getStatus()));
                hotel.setStatusChangedAt(LocalDateTime.now());
                hotel.setStatusChangedBy(adminId);
            } catch (IllegalArgumentException e) { log.warn("Unknown status: {}", request.getStatus()); }
        }
        if (request.getStatusReason() != null) hotel.setStatusReason(request.getStatusReason());
        if (request.getIsFeatured() != null) hotel.setIsFeatured(request.getIsFeatured());
        if (request.getIsVerified() != null) hotel.setIsVerified(request.getIsVerified());
        if (request.getManagedBy() != null) hotel.setManagedBy(request.getManagedBy());

        hotelRepository.save(hotel);
        auditService.log(adminId, "UPDATE_HOTEL", "Hotel", hotelId, before, hotel, null, null);
        log.info("Hotel updated: hotelId={} by adminId={}", hotelId, adminId);
        return hotelService.getById(hotelId, null);
    }

    @Transactional
    public HotelDetailDto changeStatus(UUID hotelId, HotelStatusChangeRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelStatus newStatus = HotelStatus.valueOf(request.getStatus().toUpperCase());
        hotel.setStatus(newStatus);
        hotel.setStatusReason(request.getReason());
        hotel.setStatusChangedAt(LocalDateTime.now());
        hotel.setStatusChangedBy(adminId);
        hotelRepository.save(hotel);
        auditService.log(adminId, "CHANGE_HOTEL_STATUS", "Hotel", hotelId, null, null, null, request.getReason());
        return hotelService.getById(hotelId, null);
    }

    // ── Room Types ──────────────────────────────────────────────────────────────

    public List<RoomTypeDto> getRoomTypes(UUID hotelId) {
        return roomTypeRepository.findByHotelIdOrderBySortOrderAsc(hotelId).stream()
                .map(this::buildRoomTypeDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoomTypeDto createRoomType(UUID hotelId, RoomTypeRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        RoomType rt = RoomType.builder()
                .hotel(hotel)
                .name(request.getName())
                .description(request.getDescription())
                .roomCategory(request.getRoomCategory() != null ? safeEnum(RoomCategory.class, request.getRoomCategory()) : null)
                .bedType(request.getBedType())
                .maxOccupancy(request.getMaxOccupancy() != null ? request.getMaxOccupancy() : 2)
                .maxAdults(request.getMaxAdults() != null ? request.getMaxAdults() : 2)
                .maxChildren(request.getMaxChildren() != null ? request.getMaxChildren() : 1)
                .roomSizeSqft(request.getRoomSizeSqft())
                .viewType(request.getViewType() != null ? safeEnum(ViewType.class, request.getViewType()) : null)
                .bathroomType(request.getBathroomType())
                .floorNumbers(request.getFloorNumbers())
                .basePrice(request.getBasePrice())
                .extraAdultCharge(request.getExtraAdultCharge() != null ? request.getExtraAdultCharge() : BigDecimal.ZERO)
                .extraChildCharge(request.getExtraChildCharge() != null ? request.getExtraChildCharge() : BigDecimal.ZERO)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .isAvailableForBooking(request.getIsAvailableForBooking() != null ? request.getIsAvailableForBooking() : true)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .build();
        RoomType saved = roomTypeRepository.save(rt);
        // Pass null for newData to avoid lazy-loading Hotel.amenities in async audit thread
        auditService.log(adminId, "CREATE_ROOM_TYPE", "RoomType", saved.getId(), null, null, null, null);
        return buildRoomTypeDto(saved);
    }

    @Transactional
    public RoomTypeDto updateRoomType(UUID roomTypeId, RoomTypeRequest request, UUID adminId) {
        RoomType rt = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        if (request.getName() != null) rt.setName(request.getName());
        if (request.getDescription() != null) rt.setDescription(request.getDescription());
        if (request.getRoomCategory() != null) rt.setRoomCategory(safeEnum(RoomCategory.class, request.getRoomCategory()));
        if (request.getBedType() != null) rt.setBedType(request.getBedType());
        if (request.getMaxOccupancy() != null) rt.setMaxOccupancy(request.getMaxOccupancy());
        if (request.getMaxAdults() != null) rt.setMaxAdults(request.getMaxAdults());
        if (request.getMaxChildren() != null) rt.setMaxChildren(request.getMaxChildren());
        if (request.getRoomSizeSqft() != null) rt.setRoomSizeSqft(request.getRoomSizeSqft());
        if (request.getViewType() != null) rt.setViewType(safeEnum(ViewType.class, request.getViewType()));
        if (request.getBathroomType() != null) rt.setBathroomType(request.getBathroomType());
        if (request.getFloorNumbers() != null) rt.setFloorNumbers(request.getFloorNumbers());
        if (request.getBasePrice() != null) rt.setBasePrice(request.getBasePrice());
        if (request.getExtraAdultCharge() != null) rt.setExtraAdultCharge(request.getExtraAdultCharge());
        if (request.getExtraChildCharge() != null) rt.setExtraChildCharge(request.getExtraChildCharge());
        if (request.getIsActive() != null) rt.setIsActive(request.getIsActive());
        if (request.getIsAvailableForBooking() != null) rt.setIsAvailableForBooking(request.getIsAvailableForBooking());
        if (request.getSortOrder() != null) rt.setSortOrder(request.getSortOrder());
        roomTypeRepository.save(rt);
        // Pass null for newData to avoid lazy-loading Hotel.amenities in async audit thread
        auditService.log(adminId, "UPDATE_ROOM_TYPE", "RoomType", roomTypeId, null, null, null, null);
        return buildRoomTypeDto(rt);
    }

    @Transactional
    public void deleteRoomType(UUID roomTypeId, UUID adminId) {
        RoomType rt = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        roomTypeRepository.delete(rt);
        auditService.log(adminId, "DELETE_ROOM_TYPE", "RoomType", roomTypeId, null, null, null, null);
    }

    // ── Amenities ───────────────────────────────────────────────────────────────

    @Transactional
    public HotelAmenity addAmenity(UUID hotelId, AmenityRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelAmenity amenity = HotelAmenity.builder()
                .hotel(hotel)
                .amenityName(request.getAmenityName())
                .amenityIcon(request.getAmenityIcon())
                .category(request.getCategory())
                .isPaid(request.getIsPaid() != null ? request.getIsPaid() : false)
                .priceInfo(request.getPriceInfo())
                .isActive(true)
                .build();
        hotel.getAmenities().add(amenity);
        hotelRepository.save(hotel);
        return amenity;
    }

    @Transactional
    public HotelAmenity updateAmenity(UUID hotelId, UUID amenityId, AmenityRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelAmenity amenity = hotel.getAmenities().stream()
                .filter(a -> a.getId().equals(amenityId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Amenity not found"));
        if (request.getAmenityName() != null) amenity.setAmenityName(request.getAmenityName());
        if (request.getAmenityIcon() != null) amenity.setAmenityIcon(request.getAmenityIcon());
        if (request.getCategory() != null) amenity.setCategory(request.getCategory());
        if (request.getIsPaid() != null) amenity.setIsPaid(request.getIsPaid());
        if (request.getPriceInfo() != null) amenity.setPriceInfo(request.getPriceInfo());
        if (request.getIsActive() != null) amenity.setIsActive(request.getIsActive());
        hotelRepository.save(hotel);
        return amenity;
    }

    @Transactional
    public void deleteAmenity(UUID hotelId, UUID amenityId, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        hotel.getAmenities().removeIf(a -> a.getId().equals(amenityId));
        hotelRepository.save(hotel);
    }

    // ── Nearby Places ───────────────────────────────────────────────────────────

    @Transactional
    public HotelNearbyPlace addNearbyPlace(UUID hotelId, NearbyPlaceRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelNearbyPlace place = HotelNearbyPlace.builder()
                .hotel(hotel)
                .placeName(request.getPlaceName())
                .placeType(request.getPlaceType() != null ? safeEnum(NearbyPlaceType.class, request.getPlaceType()) : null)
                .distanceKm(request.getDistanceKm())
                .travelTimeMinutes(request.getTravelTimeMinutes())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();
        hotel.getNearbyPlaces().add(place);
        hotelRepository.save(hotel);
        return place;
    }

    @Transactional
    public HotelNearbyPlace updateNearbyPlace(UUID hotelId, UUID placeId, NearbyPlaceRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelNearbyPlace place = hotel.getNearbyPlaces().stream()
                .filter(p -> p.getId().equals(placeId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Nearby place not found"));
        if (request.getPlaceName() != null) place.setPlaceName(request.getPlaceName());
        if (request.getPlaceType() != null) place.setPlaceType(safeEnum(NearbyPlaceType.class, request.getPlaceType()));
        if (request.getDistanceKm() != null) place.setDistanceKm(request.getDistanceKm());
        if (request.getTravelTimeMinutes() != null) place.setTravelTimeMinutes(request.getTravelTimeMinutes());
        if (request.getLatitude() != null) place.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) place.setLongitude(request.getLongitude());
        hotelRepository.save(hotel);
        return place;
    }

    @Transactional
    public void deleteNearbyPlace(UUID hotelId, UUID placeId, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        hotel.getNearbyPlaces().removeIf(p -> p.getId().equals(placeId));
        hotelRepository.save(hotel);
    }

    // ── Policies ────────────────────────────────────────────────────────────────

    @Transactional
    public HotelPolicy addPolicy(UUID hotelId, PolicyRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelPolicy policy = HotelPolicy.builder()
                .hotel(hotel)
                .policyType(request.getPolicyType())
                .title(request.getTitle())
                .description(request.getDescription())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .build();
        hotel.getPolicies().add(policy);
        hotelRepository.save(hotel);
        return policy;
    }

    @Transactional
    public HotelPolicy updatePolicy(UUID hotelId, UUID policyId, PolicyRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelPolicy policy = hotel.getPolicies().stream()
                .filter(p -> p.getId().equals(policyId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found"));
        if (request.getPolicyType() != null) policy.setPolicyType(request.getPolicyType());
        if (request.getTitle() != null) policy.setTitle(request.getTitle());
        if (request.getDescription() != null) policy.setDescription(request.getDescription());
        if (request.getSortOrder() != null) policy.setSortOrder(request.getSortOrder());
        hotelRepository.save(hotel);
        return policy;
    }

    @Transactional
    public void deletePolicy(UUID hotelId, UUID policyId, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        hotel.getPolicies().removeIf(p -> p.getId().equals(policyId));
        hotelRepository.save(hotel);
    }

    // ── FAQs ────────────────────────────────────────────────────────────────────

    @Transactional
    public HotelFaq addFaq(UUID hotelId, FaqRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelFaq faq = HotelFaq.builder()
                .hotel(hotel)
                .question(request.getQuestion())
                .answer(request.getAnswer())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .isActive(true)
                .build();
        hotel.getFaqs().add(faq);
        hotelRepository.save(hotel);
        return faq;
    }

    @Transactional
    public HotelFaq updateFaq(UUID hotelId, UUID faqId, FaqRequest request, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelFaq faq = hotel.getFaqs().stream()
                .filter(f -> f.getId().equals(faqId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("FAQ not found"));
        if (request.getQuestion() != null) faq.setQuestion(request.getQuestion());
        if (request.getAnswer() != null) faq.setAnswer(request.getAnswer());
        if (request.getSortOrder() != null) faq.setSortOrder(request.getSortOrder());
        if (request.getIsActive() != null) faq.setIsActive(request.getIsActive());
        hotelRepository.save(hotel);
        return faq;
    }

    @Transactional
    public void deleteFaq(UUID hotelId, UUID faqId, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        hotel.getFaqs().removeIf(f -> f.getId().equals(faqId));
        hotelRepository.save(hotel);
    }

    // ── Images ──────────────────────────────────────────────────────────────────

    @Transactional
    public HotelImage uploadImage(UUID hotelId, MultipartFile file, String category,
                                   String caption, Boolean isPrimary, Integer sortOrder, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        String uploadDir = "uploads/hotels/" + hotelId;
        new File(uploadDir).mkdirs();
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, filename);
        try {
            Files.write(filePath, file.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("Failed to save image: " + e.getMessage());
        }

        String imageUrl = "/uploads/hotels/" + hotelId + "/" + filename;

        if (Boolean.TRUE.equals(isPrimary)) {
            hotel.getImages().forEach(img -> img.setIsPrimary(false));
        }

        HotelImage image = HotelImage.builder()
                .hotel(hotel)
                .imageUrl(imageUrl)
                .thumbnailUrl(imageUrl)
                .caption(caption)
                .category(category != null ? safeEnum(ImageCategory.class, category) : null)
                .sortOrder(sortOrder != null ? sortOrder : hotel.getImages().size())
                .isPrimary(isPrimary != null ? isPrimary : hotel.getImages().isEmpty())
                .uploadedBy(adminId)
                .build();

        hotel.getImages().add(image);
        hotelRepository.save(hotel);
        return image;
    }

    @Transactional
    public HotelImage updateImage(UUID hotelId, UUID imageId, String caption, String category,
                                   Boolean isPrimary, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        HotelImage image = hotel.getImages().stream()
                .filter(i -> i.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));

        if (caption != null) image.setCaption(caption);
        if (category != null) image.setCategory(safeEnum(ImageCategory.class, category));
        if (Boolean.TRUE.equals(isPrimary)) {
            hotel.getImages().forEach(img -> img.setIsPrimary(false));
            image.setIsPrimary(true);
        }
        hotelRepository.save(hotel);
        return image;
    }

    @Transactional
    public void deleteImage(UUID hotelId, UUID imageId, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        hotel.getImages().stream()
                .filter(i -> i.getId().equals(imageId))
                .findFirst()
                .ifPresent(img -> {
                    try {
                        String url = img.getImageUrl();
                        if (url != null && url.startsWith("/uploads/")) {
                            Files.deleteIfExists(Paths.get(url.substring(1)));
                        }
                    } catch (IOException e) {
                        log.warn("Could not delete image file: {}", e.getMessage());
                    }
                });
        hotel.getImages().removeIf(i -> i.getId().equals(imageId));
        hotelRepository.save(hotel);
    }

    @Transactional
    public void setPrimaryImage(UUID hotelId, UUID imageId, UUID adminId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));
        hotel.getImages().forEach(img -> img.setIsPrimary(img.getId().equals(imageId)));
        hotelRepository.save(hotel);
    }

    // ── Inventory ───────────────────────────────────────────────────────────────

    @Transactional
    public void generateInventory(UUID hotelId) {
        hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found"));

        roomTypeRepository.findByHotelIdOrderBySortOrderAsc(hotelId).forEach(roomType -> {
            // Use actual room count for this room type; fall back to 10 if no rooms exist yet
            int roomCount = (int) roomRepository.countByRoomTypeId(roomType.getId());
            int totalRooms = roomCount > 0 ? roomCount : 10;
            LocalDate today = LocalDate.now();
            for (int i = 0; i <= 365; i++) {
                LocalDate date = today.plusDays(i);
                if (inventoryRepository.findByRoomTypeIdAndDateForUpdate(roomType.getId(), date).isEmpty()) {
                    RoomInventory inv = RoomInventory.builder()
                            .roomTypeId(roomType.getId())
                            .date(date)
                            .totalRooms(totalRooms)
                            .availableRooms(totalRooms)
                            .basePrice(roomType.getBasePrice())
                            .build();
                    inventoryRepository.save(inv);
                }
            }
        });
        // Auto-update hotel.totalRooms
        int hotelRoomCount = (int) roomRepository.countByHotelId(hotelId);
        hotelRepository.findById(hotelId).ifPresent(h -> {
            h.setTotalRooms(hotelRoomCount);
            hotelRepository.save(h);
        });
        log.info("Inventory generated for hotelId={}", hotelId);
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private LocalTime parseTime(String time) {
        if (time == null || time.isBlank()) return null;
        try {
            return LocalTime.parse(time);
        } catch (Exception e) {
            log.warn("Could not parse time value '{}', ignoring", time);
            return null;
        }
    }

    private Hotel copyHotel(Hotel hotel) {
        return Hotel.builder()
                .id(hotel.getId())
                .name(hotel.getName())
                .status(hotel.getStatus())
                .starRating(hotel.getStarRating())
                .build();
    }

    private RoomTypeDto buildRoomTypeDto(RoomType rt) {
        int roomCount = (int) roomRepository.countByRoomTypeId(rt.getId());
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
                .bathroomType(rt.getBathroomType())
                .floorNumbers(rt.getFloorNumbers())
                .isActive(rt.getIsActive())
                .isAvailableForBooking(rt.getIsAvailableForBooking())
                .sortOrder(rt.getSortOrder())
                .basePrice(rt.getBasePrice())
                .extraAdultCharge(rt.getExtraAdultCharge())
                .extraChildCharge(rt.getExtraChildCharge())
                .availableRooms(roomCount)
                .images(rt.getImages().stream()
                        .map(img -> RoomTypeDto.ImageDto.builder()
                                .id(img.getId())
                                .imageUrl(img.getImageUrl())
                                .thumbnailUrl(img.getThumbnailUrl())
                                .isPrimary(img.getIsPrimary())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    @Transactional
    public RoomTypeImage uploadRoomTypeImage(UUID roomTypeId, MultipartFile file, Boolean isPrimary, UUID adminId) {
        RoomType rt = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        Hotel hotel = rt.getHotel();
        String uploadDir = "uploads/hotels/" + hotel.getId() + "/room-types/" + roomTypeId;
        try {
            // Use File.mkdirs() which resolves relative to JVM working directory (project root)
            File dir = new File(uploadDir);
            dir.mkdirs();
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(uploadDir, filename);
            Files.write(filePath, file.getBytes());
            String imageUrl = "/uploads/hotels/" + hotel.getId() + "/room-types/" + roomTypeId + "/" + filename;
            boolean primary = isPrimary != null && isPrimary;
            if (primary) {
                rt.getImages().forEach(img -> img.setIsPrimary(false));
            }
            boolean willBePrimary = primary || rt.getImages().isEmpty();
            RoomTypeImage img = RoomTypeImage.builder()
                    .roomType(rt)
                    .imageUrl(imageUrl)
                    .isPrimary(willBePrimary)
                    .sortOrder(rt.getImages().size())
                    .build();
            rt.getImages().add(img);
            RoomType saved = roomTypeRepository.saveAndFlush(rt);
            auditService.log(adminId, "UPLOAD_ROOM_TYPE_IMAGE", "RoomType", roomTypeId, null, null, null, null);
            // Return the persisted image (with DB-generated ID) from the saved collection
            return saved.getImages().stream()
                    .filter(i -> imageUrl.equals(i.getImageUrl()))
                    .findFirst()
                    .orElse(img);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload room type image", e);
        }
    }

    @Transactional
    public void deleteRoomTypeImage(UUID roomTypeId, UUID imageId, UUID adminId) {
        RoomType rt = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        rt.getImages().removeIf(img -> img.getId().equals(imageId));
        roomTypeRepository.save(rt);
        auditService.log(adminId, "DELETE_ROOM_TYPE_IMAGE", "RoomType", roomTypeId, null, null, null, null);
    }

    /** Safely parse an enum value; returns null on unknown value instead of throwing. */
    private <E extends Enum<E>> E safeEnum(Class<E> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown enum value '{}' for {}", value, enumClass.getSimpleName());
            return null;
        }
    }
}
