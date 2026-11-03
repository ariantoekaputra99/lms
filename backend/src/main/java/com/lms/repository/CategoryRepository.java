package com.lms.repository;

import com.lms.entity.Category;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByOrderByNameAsc();
    Optional<Category> findBySlug(String slug);
    boolean existsByNameIgnoreCase(String name);
}
