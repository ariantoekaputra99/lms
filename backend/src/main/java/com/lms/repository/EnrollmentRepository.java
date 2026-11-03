package com.lms.repository;

import com.lms.entity.Enrollment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    Optional<Enrollment> findByUserIdAndCourseId(Long userId, Long courseId);
    boolean existsByUserIdAndCourseId(Long userId, Long courseId);
    List<Enrollment> findByUserIdOrderByEnrolledAtDesc(Long userId);
    List<Enrollment> findByCourseIdOrderByEnrolledAtDesc(Long courseId);
    long countByCourseId(Long courseId);

    @Query("select count(e) from Enrollment e where e.course.instructor.id = :instructorId")
    long countByInstructorId(@Param("instructorId") Long instructorId);
}
