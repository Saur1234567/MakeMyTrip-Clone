package com.makemycrip.auth.repository;

import com.makemycrip.auth.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    List<UserSession> findByUserIdAndIsActiveTrue(UUID userId);

    long countByUserIdAndIsActiveTrue(UUID userId);

    Optional<UserSession> findByIdAndUserIdAndIsActiveTrue(UUID sessionId, UUID userId);

    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.userId = :userId AND s.id = :sessionId")
    void deactivateSession(UUID userId, UUID sessionId);

    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.userId = :userId")
    void deactivateAllSessions(UUID userId);
}
