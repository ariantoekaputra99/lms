package com.lms.repository;

import com.lms.entity.Role;
import com.lms.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByRole(Role role);
    List<User> findAllByOrderByCreatedAtDesc();
}
