package com.lms.dto;

import com.lms.entity.*;
import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public final class LearningDtos {
    private LearningDtos() {}

    public record PlayerLesson(Long id, String title, LessonType type, Integer durationMinutes, boolean completed, boolean locked) {}

    public record PlayerSection(Long id, String title, List<PlayerLesson> lessons) {}

    /** Course outline for the learning screen with the student's progress. */
    public record LearningCourse(CourseDtos.CourseSummary course, List<PlayerSection> sections,
                                 int completedLessons, int totalLessons, int progressPercent,
                                 OffsetDateTime completedAt, String certificateCode, boolean preview) {}

    /** Quiz option without the "correct" flag: answers never leave the server before an attempt. */
    public record StudentOption(Long id, String text) {}

    public record StudentQuestion(Long id, String text, List<StudentOption> options) {}

    public record AttemptSummary(Long id, int score, int correctCount, int totalCount, boolean passed, OffsetDateTime submittedAt) {
        public static AttemptSummary from(QuizAttempt a) {
            return new AttemptSummary(a.getId(), a.getScore(), a.getCorrectCount(), a.getTotalCount(), a.isPassed(), a.getSubmittedAt());
        }
    }

    public record SubmissionResponse(Long id, Long lessonId, String lessonTitle, Long courseId, String courseTitle,
                                     String studentName, String studentEmail, String originalFileName, String note,
                                     SubmissionStatus status, Integer grade, String feedback,
                                     OffsetDateTime submittedAt, OffsetDateTime gradedAt) {
        public static SubmissionResponse from(AssignmentSubmission s) {
            Lesson l = s.getLesson();
            Course c = l.getSection().getCourse();
            User u = s.getEnrollment().getUser();
            return new SubmissionResponse(s.getId(), l.getId(), l.getTitle(), c.getId(), c.getTitle(), u.getFullName(),
                u.getEmail(), s.getOriginalFileName(), s.getNote(), s.getStatus(), s.getGrade(), s.getFeedback(),
                s.getSubmittedAt(), s.getGradedAt());
        }
    }

    public record LessonContent(Long id, String title, LessonType type, Integer durationMinutes, String videoUrl,
                                String content, boolean hasFile, String originalFileName, Integer passingScore,
                                String assignmentInstructions, List<StudentQuestion> questions, boolean completed,
                                List<AttemptSummary> attempts, List<SubmissionResponse> submissions,
                                Long previousLessonId, Long nextLessonId, boolean preview) {}

    public record QuizSubmitRequest(@NotNull Map<Long, Long> answers) {}

    public record QuestionResult(Long questionId, Long chosenOptionId, Long correctOptionId, boolean correct, String explanation) {}

    public record QuizResult(int score, int correctCount, int totalCount, boolean passed, int passingScore,
                             List<QuestionResult> results, boolean courseCompleted, String certificateCode) {}

    public record CompletionResponse(boolean lessonCompleted, int progressPercent, boolean courseCompleted, String certificateCode) {}

    public record GradeRequest(@NotNull @Min(0) @Max(100) Integer grade, @Size(max = 2000) String feedback) {}

    public record MyCourse(CourseDtos.CourseSummary course, int completedLessons, int totalLessons, int progressPercent,
                           OffsetDateTime enrolledAt, OffsetDateTime completedAt, String certificateCode) {}

    public record CertificateResponse(String code, String studentName, String courseTitle, String instructorName,
                                      OffsetDateTime issuedAt, String courseSlug) {
        public static CertificateResponse from(Certificate c) {
            return new CertificateResponse(c.getCode(), c.getStudentName(), c.getCourseTitle(), c.getInstructorName(),
                c.getIssuedAt(), c.getEnrollment().getCourse().getSlug());
        }
    }

    public record CourseStudent(Long userId, String fullName, String email, OffsetDateTime enrolledAt,
                                int progressPercent, OffsetDateTime completedAt) {}
}
