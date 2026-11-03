package com.lms.controller;

import com.lms.dto.CourseDtos.CategoryResponse;
import com.lms.dto.CourseDtos.CourseDetail;
import com.lms.dto.CourseDtos.CourseSummary;
import com.lms.dto.LearningDtos.CertificateResponse;
import com.lms.dto.LearningDtos.LessonContent;
import com.lms.entity.CourseLevel;
import com.lms.service.*;
import com.lms.service.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Endpoints reachable without login (see SecurityConfig: GET /api/public/**). */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {
    private final CourseService courses;
    private final CategoryService categories;
    private final LearningService learning;
    private final CertificatePdfService certificatePdf;
    private final FileStorageService files;
    private final PaymentService payments;

    @GetMapping("/courses")
    public List<CourseSummary> catalog(@RequestParam(required = false) String q,
                                       @RequestParam(required = false) String category,
                                       @RequestParam(required = false) CourseLevel level,
                                       @RequestParam(required = false) String price,
                                       @RequestParam(required = false) String sort) {
        return courses.catalog(q, category, level, price, sort);
    }

    /** Also used when logged in: then it tells whether the user is enrolled / can manage. */
    @GetMapping("/courses/{slug}")
    public CourseDetail course(@PathVariable String slug) {
        return courses.detail(slug);
    }

    @GetMapping("/courses/{id}/thumbnail")
    public ResponseEntity<Resource> thumbnail(@PathVariable Long id) {
        Path path = courses.thumbnail(id);
        return ResponseEntity.ok()
            .contentType(files.mediaType(path.getFileName().toString()))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
            .body(new FileSystemResource(path));
    }

    @GetMapping("/lessons/{id}/preview")
    public LessonContent preview(@PathVariable Long id) {
        return learning.publicPreview(id);
    }

    @GetMapping("/categories")
    public List<CategoryResponse> categories() {
        return categories.list();
    }

    @GetMapping("/certificates/{code}")
    public CertificateResponse verify(@PathVariable String code) {
        return learning.verify(code);
    }

    @GetMapping("/certificates/{code}/pdf")
    public ResponseEntity<byte[]> certificatePdf(@PathVariable String code) {
        byte[] pdf = certificatePdf.render(code);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename("sertifikat-" + code + ".pdf").build().toString())
            .body(pdf);
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of("paymentProvider", payments.providerName());
    }
}
