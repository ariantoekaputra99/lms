package com.lms.repository;

import com.lms.entity.LessonProgress;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    List<LessonProgress> findByEnrollmentId(Long enrollmentId);
    boolean existsByEnrollmentIdAndLessonId(Long enrollmentId, Long lessonId);
    long countByEnrollmentId(Long enrollmentId);
}
