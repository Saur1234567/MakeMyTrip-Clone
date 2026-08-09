package com.makemycrip.promotion.repository;

import com.makemycrip.promotion.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    Page<Promotion> findByHotelIdOrderByCreatedAtDesc(UUID hotelId, Pageable pageable);
    List<Promotion> findByIsActiveTrueOrderByCreatedAtDesc();
}
