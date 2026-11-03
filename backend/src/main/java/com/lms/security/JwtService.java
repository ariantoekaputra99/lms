package com.lms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key; private final long expiration;
    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiration-ms}") long expiration) { key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expiration=expiration; }
    public String generate(UserDetails user) { return Jwts.builder().subject(user.getUsername()).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+expiration)).signWith(key).compact(); }
    public String username(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject(); }
    public boolean valid(String token, UserDetails user) { try { return username(token).equals(user.getUsername()) && !Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getExpiration().before(new Date()); } catch (JwtException | IllegalArgumentException e) { return false; } }
}
