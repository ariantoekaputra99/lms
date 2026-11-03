package com.lms.repository;

import com.lms.entity.AssignmentSubmission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    List<AssignmentSubmission> findByEnrollmentIdAndLessonIdOrderBySubmittedAtDesc(Long enrollmentId, Long lessonId);

    @Query("select s from AssignmentSubmission s where s.lesson.section.course.instructor.id = :instructorId order by s.submittedAt desc")
    List<AssignmentSubmission> findForInstructor(@Param("instructorId") Long instructorId);

    @Query("select s from AssignmentSubmission s order by s.submittedAt desc")
    List<AssignmentSubmission> findAllNewestFirst();
}
