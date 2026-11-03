package com.lms.security;

import com.lms.entity.Role;
import com.lms.entity.User;
import com.lms.exception.NotFoundException;
import com.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** Resolves the logged-in user (the JWT subject is the user's email). */
@Component
@RequiredArgsConstructor
public class CurrentUser {
    private final UserRepository users;

    public Optional<User> optional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) return Optional.empty();
        return users.findByEmailIgnoreCase(auth.getName());
    }

    public User get() {
        return optional().orElseThrow(() -> new NotFoundException("Pengguna tidak ditemukan"));
    }

    public static String name() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "system" : auth.getName();
    }

    public static boolean isAdmin(User user) {
        return user != null && user.getRole() == Role.ADMIN;
    }
}
