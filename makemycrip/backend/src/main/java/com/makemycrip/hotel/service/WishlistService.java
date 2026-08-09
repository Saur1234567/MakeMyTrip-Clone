package com.makemycrip.hotel.service;

import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.hotel.dto.HotelSummaryDto;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.Wishlist;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.ReviewRepository;
import com.makemycrip.hotel.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final HotelRepository hotelRepository;
    private final ReviewRepository reviewRepository;

    @Transactional
    public boolean toggle(UUID userId, UUID hotelId) {
        if (!hotelRepository.existsById(hotelId)) {
            throw new ResourceNotFoundException("Hotel not found");
        }
        if (wishlistRepository.existsByUserIdAndHotelId(userId, hotelId)) {
            wishlistRepository.deleteByUserIdAndHotelId(userId, hotelId);
            return false;
        } else {
            wishlistRepository.save(Wishlist.builder().userId(userId).hotelId(hotelId).build());
            return true;
        }
    }

    public List<HotelSummaryDto> getUserWishlist(UUID userId) {
        return wishlistRepository.findByUserIdOrderByAddedAtDesc(userId).stream()
                .map(w -> {
                    Hotel hotel = hotelRepository.findById(w.getHotelId()).orElse(null);
                    if (hotel == null) return null;
                    Double rating = reviewRepository.findAverageRatingByHotelId(hotel.getId());
                    Long reviewCount = reviewRepository.countApprovedByHotelId(hotel.getId());
                    String primaryImage = hotel.getImages().stream()
                            .filter(i -> Boolean.TRUE.equals(i.getIsPrimary())).findFirst()
                            .map(com.makemycrip.hotel.entity.HotelImage::getImageUrl).orElse(null);
                    return HotelSummaryDto.builder()
                            .id(hotel.getId())
                            .name(hotel.getName())
                            .slug(hotel.getSlug())
                            .shortDescription(hotel.getShortDescription())
                            .city(hotel.getCity())
                            .starRating(hotel.getStarRating())
                            .guestRating(rating)
                            .reviewCount(reviewCount)
                            .primaryImageUrl(primaryImage)
                            .isWishlisted(true)
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }
}
