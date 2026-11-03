package com.lms.service;

import com.lms.entity.User;
import com.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UserRepository users;

    @Override
    public UserDetails loadUserByUsername(String email) {
        User u = users.findByEmailIgnoreCase(email).orElseThrow(() -> new UsernameNotFoundException(email));
        return org.springframework.security.core.userdetails.User.withUsername(u.getEmail())
            .password(u.getPassword())
            .roles(u.getRole().name())
            .disabled(!u.isActive())
            .build();
    }
}
