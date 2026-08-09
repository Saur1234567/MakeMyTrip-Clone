package com.makemycrip.hotel.repository;

import com.makemycrip.hotel.dto.HotelSearchRequest;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.HotelAmenity;
import com.makemycrip.hotel.entity.Review;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.enums.CancellationPolicy;
import com.makemycrip.hotel.enums.HotelStatus;
import com.makemycrip.hotel.enums.ReviewStatus;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class HotelSpecification {

    public static Specification<Hotel> buildSearchSpec(HotelSearchRequest req) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // ── Mandatory: city (case-insensitive) + active status ──────────────
            predicates.add(cb.equal(cb.lower(root.get("city")), req.getCity().toLowerCase()));
            predicates.add(cb.equal(root.get("status"), HotelStatus.ACTIVE));

            // ── Price filter: hotel must have at least one room type whose
            //    basePrice falls within [minPrice, maxPrice] ────────────────────
            if (req.getMinPrice() != null || req.getMaxPrice() != null) {
                Subquery<Long> priceSubquery = query.subquery(Long.class);
                Root<RoomType> rtRoot = priceSubquery.from(RoomType.class);
                priceSubquery.select(cb.literal(1L));

                List<Predicate> pricePreds = new ArrayList<>();
                pricePreds.add(cb.equal(rtRoot.get("hotel"), root));
                pricePreds.add(cb.isTrue(rtRoot.get("isActive")));

                if (req.getMinPrice() != null) {
                    pricePreds.add(cb.greaterThanOrEqualTo(
                            rtRoot.get("basePrice"), req.getMinPrice()));
                }
                if (req.getMaxPrice() != null) {
                    pricePreds.add(cb.lessThanOrEqualTo(
                            rtRoot.get("basePrice"), req.getMaxPrice()));
                }

                priceSubquery.where(pricePreds.toArray(new Predicate[0]));
                predicates.add(cb.exists(priceSubquery));
            }

            // ── Star rating filter ────────────────────────────────────────────
            if (req.getStarRatings() != null && !req.getStarRatings().isEmpty()) {
                List<Predicate> starPredicates = req.getStarRatings().stream()
                        .map(star -> cb.between(
                                root.<BigDecimal>get("starRating"),
                                BigDecimal.valueOf(star - 0.1),
                                BigDecimal.valueOf(star + 0.9)))
                        .map(p -> (Predicate) p)
                        .toList();
                predicates.add(cb.or(starPredicates.toArray(new Predicate[0])));
            }

            // ── Hotel type filter ─────────────────────────────────────────────
            if (req.getHotelTypes() != null && !req.getHotelTypes().isEmpty()) {
                predicates.add(root.get("hotelType").as(String.class).in(req.getHotelTypes()));
            }

            // ── Free cancellation filter ──────────────────────────────────────
            if (Boolean.TRUE.equals(req.getFreeCancellation())) {
                predicates.add(root.get("cancellationPolicy").in(
                        CancellationPolicy.FLEXIBLE, CancellationPolicy.MODERATE));
            }

            // ── Amenities filter: hotel must have ALL requested amenities ─────
            if (req.getAmenities() != null && !req.getAmenities().isEmpty()) {
                for (String amenityName : req.getAmenities()) {
                    Subquery<Long> amenitySubquery = query.subquery(Long.class);
                    Root<HotelAmenity> amenityRoot = amenitySubquery.from(HotelAmenity.class);
                    amenitySubquery.select(cb.literal(1L));
                    amenitySubquery.where(
                            cb.equal(amenityRoot.get("hotel"), root),
                            cb.equal(cb.upper(amenityRoot.get("amenityName")), amenityName.toUpperCase()),
                            cb.isTrue(amenityRoot.get("isActive"))
                    );
                    predicates.add(cb.exists(amenitySubquery));
                }
            }

            // ── Guest rating filter: avg review rating >= minGuestRating ─────
            if (req.getMinGuestRating() != null) {
                Subquery<Double> ratingSubquery = query.subquery(Double.class);
                Root<Review> reviewRoot = ratingSubquery.from(Review.class);
                ratingSubquery.select(cb.avg(reviewRoot.get("overallRating").as(Double.class)));
                ratingSubquery.where(
                        cb.equal(reviewRoot.get("hotelId"), root.get("id")),
                        cb.equal(reviewRoot.get("status"), ReviewStatus.APPROVED)
                );
                predicates.add(cb.greaterThanOrEqualTo(ratingSubquery, req.getMinGuestRating()));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
