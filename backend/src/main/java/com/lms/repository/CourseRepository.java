package com.lms.repository;

import com.lms.entity.Course;
import com.lms.entity.CourseStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<Course> findByStatusOrderByPublishedAtDesc(CourseStatus status);
    List<Course> findByInstructorIdOrderByUpdatedAtDesc(Long instructorId);
    List<Course> findAllByOrderByUpdatedAtDesc();
    long countByStatus(CourseStatus status);
    long countByCategoryId(Long categoryId);
}
