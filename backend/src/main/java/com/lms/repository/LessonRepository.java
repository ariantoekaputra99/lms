package com.lms.repository;

import com.lms.entity.Lesson;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    @Query("select count(l) from Lesson l where l.section.course.id = :courseId")
    long countByCourseId(@Param("courseId") Long courseId);

    @Query("select l from Lesson l where l.section.course.id = :courseId order by l.section.position, l.position")
    List<Lesson> findByCourseIdOrdered(@Param("courseId") Long courseId);
}
