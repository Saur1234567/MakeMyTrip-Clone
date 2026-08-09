package com.makemycrip.auth.repository;

import com.makemycrip.auth.entity.OtpStore;
import com.makemycrip.auth.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpStoreRepository extends JpaRepository<OtpStore, UUID> {

    Optional<OtpStore> findTopByIdentifierAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(
            String identifier, OtpPurpose purpose);

    @Modifying
    @Query("UPDATE OtpStore o SET o.isUsed = true WHERE o.identifier = :identifier AND o.purpose = :purpose")
    void invalidateAllForIdentifier(String identifier, OtpPurpose purpose);

    @Modifying
    @Query("DELETE FROM OtpStore o WHERE o.expiresAt < :now")
    void deleteExpired(LocalDateTime now);
}
