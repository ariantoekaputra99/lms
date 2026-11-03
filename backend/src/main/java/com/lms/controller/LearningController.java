package com.lms.controller;

import com.lms.dto.LearningDtos.*;
import com.lms.service.FileStorageService;
import com.lms.service.LearningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/** Student-side endpoints. Access to content is checked per enrollment in LearningService. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LearningController {
    private final LearningService learning;
    private final FileStorageService files;

    @PostMapping("/courses/{id}/enroll")
    public MyCourse enrollFree(@PathVariable Long id) {
        return learning.enrollFree(id);
    }

    @GetMapping("/me/courses")
    public List<MyCourse> myCourses() {
        return learning.myCourses();
    }

    @GetMapping("/me/certificates")
    public List<CertificateResponse> myCertificates() {
        return learning.myCertificates();
    }

    @GetMapping("/learn/courses/{id}")
    public LearningCourse learning(@PathVariable Long id) {
        return learning.learning(id);
    }

    @GetMapping("/learn/lessons/{id}")
    public LessonContent lesson(@PathVariable Long id) {
        return learning.lesson(id);
    }

    @GetMapping("/learn/lessons/{id}/file")
    public ResponseEntity<Resource> lessonFile(@PathVariable Long id) {
        Path path = learning.lessonFile(id);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .cacheControl(CacheControl.noStore())
            .body(new FileSystemResource(path));
    }

    @PostMapping("/learn/lessons/{id}/complete")
    public CompletionResponse complete(@PathVariable Long id) {
        return learning.complete(id);
    }

    @PostMapping("/learn/lessons/{id}/quiz")
    public QuizResult submitQuiz(@PathVariable Long id, @Valid @RequestBody QuizSubmitRequest request) {
        return learning.submitQuiz(id, request);
    }

    @PostMapping(value = "/learn/lessons/{id}/submission", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SubmissionResponse submit(@PathVariable Long id, @RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "note", required = false) String note) {
        return learning.submitAssignment(id, file, note);
    }

    @GetMapping("/submissions/{id}/file")
    public ResponseEntity<Resource> submissionFile(@PathVariable Long id) {
        Map.Entry<Path, String> f = learning.submissionFile(id);
        return ResponseEntity.ok()
            .contentType(files.mediaType(f.getKey().getFileName().toString()))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(f.getValue(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
            .body(new FileSystemResource(f.getKey()));
    }
}
