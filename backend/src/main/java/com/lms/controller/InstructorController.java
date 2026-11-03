package com.lms.controller;

import com.lms.dto.CourseDtos.*;
import com.lms.dto.LearningDtos.CourseStudent;
import com.lms.dto.LearningDtos.GradeRequest;
import com.lms.dto.LearningDtos.SubmissionResponse;
import com.lms.dto.PaymentDtos.InstructorStats;
import com.lms.service.CourseService;
import com.lms.service.LearningService;
import com.lms.service.StatsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Course authoring. Ownership is checked in CourseService (admins may manage any course). */
@RestController
@RequestMapping("/api/instructor")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
public class InstructorController {
    private final CourseService courses;
    private final LearningService learning;
    private final StatsService stats;

    @GetMapping("/stats")
    public InstructorStats stats() {
        return stats.instructor();
    }

    @GetMapping("/courses")
    public List<CourseSummary> myCourses() {
        return courses.manageable();
    }

    @PostMapping("/courses")
    public ResponseEntity<CourseEditor> create(@Valid @RequestBody CourseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courses.create(request));
    }

    @GetMapping("/courses/{id}")
    public CourseEditor editor(@PathVariable Long id) {
        return courses.editor(id);
    }

    @PutMapping("/courses/{id}")
    public CourseEditor update(@PathVariable Long id, @Valid @RequestBody CourseRequest request) {
        return courses.update(id, request);
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        courses.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/courses/{id}/thumbnail", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CourseEditor thumbnail(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return courses.uploadThumbnail(id, file);
    }

    @PostMapping("/courses/{id}/publish")
    public CourseEditor publish(@PathVariable Long id) {
        return courses.publish(id);
    }

    @PostMapping("/courses/{id}/unpublish")
    public CourseEditor unpublish(@PathVariable Long id) {
        return courses.unpublish(id);
    }

    @PostMapping("/courses/{id}/archive")
    public CourseEditor archive(@PathVariable Long id) {
        return courses.archive(id);
    }

    @GetMapping("/courses/{id}/students")
    public List<CourseStudent> students(@PathVariable Long id) {
        return learning.students(id);
    }

    @PostMapping("/courses/{id}/sections")
    public CourseEditor addSection(@PathVariable Long id, @Valid @RequestBody SectionRequest request) {
        return courses.addSection(id, request);
    }

    @PutMapping("/sections/{id}")
    public CourseEditor updateSection(@PathVariable Long id, @Valid @RequestBody SectionRequest request) {
        return courses.updateSection(id, request);
    }

    @DeleteMapping("/sections/{id}")
    public CourseEditor deleteSection(@PathVariable Long id) {
        return courses.deleteSection(id);
    }

    @PostMapping("/sections/{id}/move")
    public CourseEditor moveSection(@PathVariable Long id, @Valid @RequestBody MoveRequest request) {
        return courses.moveSection(id, request.direction());
    }

    @PostMapping("/sections/{id}/lessons")
    public CourseEditor addLesson(@PathVariable Long id, @Valid @RequestBody LessonRequest request) {
        return courses.addLesson(id, request);
    }

    @PutMapping("/lessons/{id}")
    public CourseEditor updateLesson(@PathVariable Long id, @Valid @RequestBody LessonRequest request) {
        return courses.updateLesson(id, request);
    }

    @DeleteMapping("/lessons/{id}")
    public CourseEditor deleteLesson(@PathVariable Long id) {
        return courses.deleteLesson(id);
    }

    @PostMapping("/lessons/{id}/move")
    public CourseEditor moveLesson(@PathVariable Long id, @Valid @RequestBody MoveRequest request) {
        return courses.moveLesson(id, request.direction());
    }

    @PostMapping(value = "/lessons/{id}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CourseEditor lessonFile(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return courses.uploadLessonFile(id, file);
    }

    @PutMapping("/lessons/{id}/quiz")
    public CourseEditor saveQuiz(@PathVariable Long id, @Valid @RequestBody QuizRequest request) {
        return courses.saveQuiz(id, request);
    }

    @GetMapping("/submissions")
    public List<SubmissionResponse> submissions() {
        return learning.submissionsForMe();
    }

    @PostMapping("/submissions/{id}/grade")
    public SubmissionResponse grade(@PathVariable Long id, @Valid @RequestBody GradeRequest request) {
        return learning.grade(id, request);
    }
}
