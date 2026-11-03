package com.lms.dto;

import com.lms.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

public final class CourseDtos {
    private CourseDtos() {}

    // ---------- requests ----------

    public record CourseRequest(@NotBlank @Size(max = 160) String title,
                                @Size(max = 255) String subtitle,
                                @Size(max = 20000) String description,
                                @Size(max = 5000) String whatYouLearn,
                                @NotNull CourseLevel level,
                                @NotNull @DecimalMin("0") @DecimalMax("100000000") BigDecimal price,
                                Long categoryId) {}

    public record SectionRequest(@NotBlank @Size(max = 160) String title) {}

    public record LessonRequest(@NotBlank @Size(max = 160) String title,
                                @NotNull LessonType type,
                                @Min(0) @Max(1440) Integer durationMinutes,
                                boolean freePreview,
                                @Size(max = 500) String videoUrl,
                                @Size(max = 100000) String content,
                                @Min(0) @Max(100) Integer passingScore,
                                @Size(max = 5000) String assignmentInstructions) {}

    public record MoveRequest(@NotNull Direction direction) {
        public enum Direction { UP, DOWN }
    }

    public record QuizRequest(@NotEmpty @Size(max = 100) List<@Valid Question> questions) {
        public record Question(@NotBlank @Size(max = 2000) String text,
                               @Size(max = 2000) String explanation,
                               @NotEmpty @Size(min = 2, max = 8) List<@Valid Option> options) {}

        public record Option(@NotBlank @Size(max = 500) String text, boolean correct) {}
    }

    public record CategoryRequest(@NotBlank @Size(max = 80) String name) {}

    // ---------- responses ----------

    public record CategoryResponse(Long id, String name, String slug, long courseCount) {}

    public record InstructorInfo(Long id, String fullName, String headline, String bio) {
        public static InstructorInfo from(User u) {
            return new InstructorInfo(u.getId(), u.getFullName(), u.getHeadline(), u.getBio());
        }
    }

    public record CourseSummary(Long id, String slug, String title, String subtitle, CourseLevel level,
                                BigDecimal price, boolean free, String thumbnailUrl, String categoryName,
                                String categorySlug, String instructorName, CourseStatus status, int lessonCount,
                                int totalMinutes, long studentCount, OffsetDateTime updatedAt,
                                OffsetDateTime publishedAt) {
        public static CourseSummary from(Course c, long studentCount) {
            List<Lesson> lessons = c.getSections().stream().flatMap(s -> s.getLessons().stream()).toList();
            int minutes = lessons.stream().map(Lesson::getDurationMinutes).filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
            return new CourseSummary(c.getId(), c.getSlug(), c.getTitle(), c.getSubtitle(), c.getLevel(), c.getPrice(),
                c.isFree(), CourseDtos.thumbnailUrl(c), c.getCategory() == null ? null : c.getCategory().getName(),
                c.getCategory() == null ? null : c.getCategory().getSlug(), c.getInstructor().getFullName(),
                c.getStatus(), lessons.size(), minutes, studentCount, c.getUpdatedAt(), c.getPublishedAt());
        }
    }

    public static String thumbnailUrl(Course c) {
        return c.getThumbnailFile() == null ? null
            : "/public/courses/" + c.getId() + "/thumbnail?v=" + Integer.toHexString(c.getThumbnailFile().hashCode());
    }

    /** Public outline: titles and types only, never lesson bodies. */
    public record OutlineLesson(Long id, String title, LessonType type, Integer durationMinutes, boolean freePreview) {}

    public record OutlineSection(Long id, String title, List<OutlineLesson> lessons) {
        public static OutlineSection from(Section s) {
            return new OutlineSection(s.getId(), s.getTitle(), s.getLessons().stream()
                .map(l -> new OutlineLesson(l.getId(), l.getTitle(), l.getType(), l.getDurationMinutes(), l.isFreePreview()))
                .toList());
        }
    }

    public record CourseDetail(CourseSummary course, String description, List<String> whatYouLearn,
                               InstructorInfo instructor, List<OutlineSection> sections,
                               boolean enrolled, boolean canManage) {
        public static CourseDetail from(Course c, long students, boolean enrolled, boolean canManage) {
            return new CourseDetail(CourseSummary.from(c, students), c.getDescription(), lines(c.getWhatYouLearn()),
                InstructorInfo.from(c.getInstructor()), c.getSections().stream().map(OutlineSection::from).toList(),
                enrolled, canManage);
        }
    }

    static List<String> lines(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split("\\R")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    // ---------- editor (owner/admin only; includes bodies and quiz answers) ----------

    public record EditorOption(Long id, String text, boolean correct) {}

    public record EditorQuestion(Long id, String text, String explanation, List<EditorOption> options) {}

    public record EditorLesson(Long id, String title, LessonType type, int position, Integer durationMinutes,
                               boolean freePreview, String videoUrl, String content, boolean hasFile,
                               String originalFileName, Integer passingScore, String assignmentInstructions,
                               List<EditorQuestion> questions) {
        public static EditorLesson from(Lesson l) {
            return new EditorLesson(l.getId(), l.getTitle(), l.getType(), l.getPosition(), l.getDurationMinutes(),
                l.isFreePreview(), l.getVideoUrl(), l.getContent(), l.getFileName() != null, l.getOriginalFileName(),
                l.getPassingScore(), l.getAssignmentInstructions(),
                l.getQuestions().stream().map(q -> new EditorQuestion(q.getId(), q.getText(), q.getExplanation(),
                    q.getOptions().stream().map(o -> new EditorOption(o.getId(), o.getText(), o.isCorrect())).toList())).toList());
        }
    }

    public record EditorSection(Long id, String title, int position, List<EditorLesson> lessons) {
        public static EditorSection from(Section s) {
            return new EditorSection(s.getId(), s.getTitle(), s.getPosition(), s.getLessons().stream().map(EditorLesson::from).toList());
        }
    }

    public record CourseEditor(CourseSummary course, String description, String whatYouLearn, Long categoryId,
                               List<EditorSection> sections, List<String> publishProblems) {}
}
