package com.lms.config;

import com.lms.security.JwtAuthFilter;
import com.lms.service.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthFilter jwtFilter;
    private final UserDetailsServiceImpl users;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http
            .csrf(c -> c.disable())
            .cors(c -> c.configurationSource(cors()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/login", "/api/auth/register", "/swagger-ui/**", "/swagger-ui.html",
                    "/v3/api-docs/**", "/actuator/health", "/actuator/health/**").permitAll()
                // Public catalogue, thumbnails and certificate verification
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                // Payment gateway webhook (verified by signature inside the controller)
                .requestMatchers(HttpMethod.POST, "/api/payments/midtrans/notification").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(HttpStatus.UNAUTHORIZED.value());
                    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(res.getOutputStream(),
                        ApiExceptionHandler.body(HttpStatus.UNAUTHORIZED, "Sesi login tidak valid atau sudah berakhir"));
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setStatus(HttpStatus.FORBIDDEN.value());
                    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(res.getOutputStream(),
                        ApiExceptionHandler.body(HttpStatus.FORBIDDEN, "Anda tidak memiliki akses untuk aksi ini"));
                }))
            .userDetailsService(users)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    CorsConfigurationSource cors() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Content-Disposition"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
