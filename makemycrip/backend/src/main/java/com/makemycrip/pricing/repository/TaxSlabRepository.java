package com.makemycrip.pricing.repository;

import com.makemycrip.pricing.entity.TaxSlab;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaxSlabRepository extends JpaRepository<TaxSlab, UUID> {
    List<TaxSlab> findByIsActiveTrueOrderByMinAmountAsc();
    List<TaxSlab> findAllByOrderByMinAmountAsc();
}
