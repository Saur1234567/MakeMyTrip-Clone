package com.makemycrip.pricing.repository;

import com.makemycrip.pricing.entity.TaxFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaxFeeRepository extends JpaRepository<TaxFee, UUID> {
    List<TaxFee> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<TaxFee> findByScopeAndIsActiveTrueOrderByDisplayOrderAsc(String scope);
    List<TaxFee> findByHotelIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID hotelId);
    List<TaxFee> findAllByOrderByDisplayOrderAsc();
}
