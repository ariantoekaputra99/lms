package com.lms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/** Names and title are snapshotted so a certificate never changes after it is issued. */
@Entity
@Table(name = "certificates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Certificate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", unique = true)
    private Enrollment enrollment;

    @Column(nullable = false)
    private String studentName;

    @Column(nullable = false)
    private String courseTitle;

    @Column(nullable = false)
    private String instructorName;

    @Column(nullable = false)
    private OffsetDateTime issuedAt;
}
