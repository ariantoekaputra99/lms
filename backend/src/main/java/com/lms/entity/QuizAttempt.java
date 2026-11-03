package com.lms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "quiz_attempts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QuizAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id")
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int correctCount;

    @Column(nullable = false)
    private int totalCount;

    @Column(nullable = false)
    private boolean passed;

    /** JSON map of questionId -> chosen optionId. */
    @Column(nullable = false)
    private String answers;

    @Column(nullable = false)
    private OffsetDateTime submittedAt;
}
