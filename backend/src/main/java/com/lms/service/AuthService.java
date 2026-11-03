package com.lms.service;

import com.lms.dto.AuthDtos.*;
import com.lms.entity.Role;
import com.lms.entity.User;
import com.lms.exception.BusinessException;
import com.lms.repository.UserRepository;
import com.lms.security.CurrentUser;
import com.lms.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository users;
    private final UserDetailsServiceImpl details;
    private final JwtService jwt;
    private final PasswordEncoder encoder;
    private final CurrentUser currentUser;

    @Value("${app.allow-instructor-signup:true}")
    private boolean allowInstructorSignup;

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        return new AuthResponse(jwt.generate(details.loadUserByUsername(user.getEmail())), UserResponse.from(user));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw new BusinessException("Email sudah terdaftar");
        if (request.instructor() && !allowInstructorSignup) {
            throw new BusinessException("Pendaftaran instruktur sedang ditutup");
        }
        User user = users.save(User.builder()
            .email(email)
            .fullName(request.fullName().trim())
            .password(encoder.encode(request.password()))
            .role(request.instructor() ? Role.INSTRUCTOR : Role.STUDENT)
            .active(true)
            .build());
        return new AuthResponse(jwt.generate(details.loadUserByUsername(user.getEmail())), UserResponse.from(user));
    }

    public UserResponse me() {
        return UserResponse.from(currentUser.get());
    }

    @Transactional
    public UserResponse updateProfile(ProfileRequest request) {
        User user = currentUser.get();
        user.setFullName(request.fullName().trim());
        user.setHeadline(blankToNull(request.headline()));
        user.setBio(blankToNull(request.bio()));
        return UserResponse.from(users.save(user));
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser.get();
        if (!encoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BusinessException("Password lama tidak sesuai");
        }
        user.setPassword(encoder.encode(request.newPassword()));
        users.save(user);
    }

    static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
