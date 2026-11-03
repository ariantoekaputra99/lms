package com.lms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lessons")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lesson {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id")
    private Section section;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonType type;

    @Column(nullable = false)
    private int position;

    private Integer durationMinutes;

    /** Visible on the public course page without enrolling. */
    @Builder.Default
    @Column(nullable = false)
    private boolean freePreview = false;

    /** VIDEO: YouTube, Vimeo or direct MP4 URL. */
    private String videoUrl;

    /** TEXT: markdown-ish body. */
    private String content;

    /** PDF: stored file name and the uploader's original name. */
    private String fileName;
    private String originalFileName;

    /** QUIZ: minimum score (0-100) to pass. */
    private Integer passingScore;

    /** ASSIGNMENT: what the student must submit. */
    private String assignmentInstructions;

    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private List<QuizQuestion> questions = new ArrayList<>();
}
