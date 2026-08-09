package com.makemycrip.user.entity;

import com.makemycrip.user.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    private String nationality;

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_tier")
    @Builder.Default
    private LoyaltyTier loyaltyTier = LoyaltyTier.BRONZE;

    @Column(name = "loyalty_points")
    @Builder.Default
    private Integer loyaltyPoints = 0;

    @Column(name = "is_email_verified")
    @Builder.Default
    private Boolean isEmailVerified = false;

    @Column(name = "is_phone_verified")
    @Builder.Default
    private Boolean isPhoneVerified = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "preferred_currency")
    @Builder.Default
    private String preferredCurrency = "INR";

    @Column(name = "preferred_language")
    @Builder.Default
    private String preferredLanguage = "en";

    /** Primary / legacy single role */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserRole role = UserRole.USER;

    /**
     * Multi-role support: a user can hold ADMIN + HOTEL_MANAGER + USER simultaneously.
     * Stored in the user_roles join table added by V3 migration.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private List<UserRole> roles = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        // Ensure primary role is always in the roles list
        if (roles.isEmpty() && role != null) {
            roles.add(role);
        }
    }

    public String getFullName() {
        return firstName + (lastName != null ? " " + lastName : "");
    }

    /** Returns all roles as strings (for JWT generation). */
    public List<String> getRoleNames() {
        if (roles != null && !roles.isEmpty()) {
            return roles.stream().map(UserRole::name).toList();
        }
        return role != null ? List.of(role.name()) : List.of("USER");
    }
}
