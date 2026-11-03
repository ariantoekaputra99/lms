package com.lms.repository;

import com.lms.entity.QuizAttempt;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByEnrollmentIdAndLessonIdOrderBySubmittedAtDesc(Long enrollmentId, Long lessonId);
    boolean existsByEnrollmentIdAndLessonIdAndPassedTrue(Long enrollmentId, Long lessonId);
}
