package com.lms.dto;

import com.lms.entity.Role;
import com.lms.entity.User;
import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    /** Public sign-up is limited to STUDENT or INSTRUCTOR; admins are created by other admins. */
    public record RegisterRequest(@NotBlank @Size(max = 120) String fullName,
                                  @NotBlank @Email @Size(max = 160) String email,
                                  @NotBlank @Size(min = 8, max = 72, message = "minimal 8 karakter") String password,
                                  boolean instructor) {}

    public record AuthResponse(String token, UserResponse user) {}

    public record UserResponse(Long id, String email, String fullName, Role role, String headline, String bio,
                               boolean active, OffsetDateTime createdAt) {
        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getHeadline(), u.getBio(),
                u.isActive(), u.getCreatedAt());
        }
    }

    public record ProfileRequest(@NotBlank @Size(max = 120) String fullName,
                                 @Size(max = 160) String headline,
                                 @Size(max = 2000) String bio) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 8, max = 72, message = "minimal 8 karakter") String newPassword) {}

    public record AdminUserUpdate(@NotNull Role role, boolean active) {}
}
