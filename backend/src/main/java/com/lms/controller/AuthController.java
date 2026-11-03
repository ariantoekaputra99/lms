package com.lms.controller;

import com.lms.dto.AuthDtos.*;
import com.lms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(request));
    }

    @GetMapping("/me")
    public UserResponse me() {
        return auth.me();
    }

    @PutMapping("/me")
    public UserResponse updateProfile(@Valid @RequestBody ProfileRequest request) {
        return auth.updateProfile(request);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        auth.changePassword(request);
        return ResponseEntity.noContent().build();
    }
}
