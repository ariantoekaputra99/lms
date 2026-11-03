package com.lms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quiz_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QuizOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private QuizQuestion question;

    @Column(nullable = false)
    private String text;

    @Column(nullable = false)
    private boolean correct;

    @Column(nullable = false)
    private int position;
}
