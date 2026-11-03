package com.lms.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.dto.CourseDtos;
import com.lms.dto.LearningDtos.*;
import com.lms.entity.*;
import com.lms.exception.BusinessException;
import com.lms.exception.NotFoundException;
import com.lms.repository.*;
import com.lms.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningService {
    public static final String SUBMISSIONS = "submissions";
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CourseRepository courses;
    private final LessonRepository lessons;
    private final EnrollmentRepository enrollments;
    private final LessonProgressRepository progress;
    private final QuizAttemptRepository attempts;
    private final AssignmentSubmissionRepository submissions;
    private final CertificateRepository certificates;
    private final FileStorageService files;
    private final CourseService courseService;
    private final CurrentUser currentUser;
    private final ObjectMapper json;

    // =================== enrollment ===================

    /** Enrolls in a free course. Paid courses go through PaymentService. */
    @Transactional
    public MyCourse enrollFree(Long courseId) {
        User user = currentUser.get();
        Course c = courses.findById(courseId).orElseThrow(() -> NotFoundException.of("Kursus", courseId));
        if (c.getStatus() != CourseStatus.PUBLISHED) throw new BusinessException("Kursus belum tersedia");
        if (!c.isFree()) throw new BusinessException("Kursus ini berbayar, silakan lakukan pembayaran");
        Enrollment e = enroll(user, c);
        return myCourse(e);
    }

    /** Idempotent: returns the existing enrollment if the user already has one. */
    @Transactional
    public Enrollment enroll(User user, Course course) {
        return enrollments.findByUserIdAndCourseId(user.getId(), course.getId()).orElseGet(() ->
            enrollments.save(Enrollment.builder().user(user).course(course).enrolledAt(OffsetDateTime.now()).build()));
    }

    @Transactional(readOnly = true)
    public List<MyCourse> myCourses() {
        return enrollments.findByUserIdOrderByEnrolledAtDesc(currentUser.get().getId()).stream().map(this::myCourse).toList();
    }

    // =================== learning screen ===================

    @Transactional(readOnly = true)
    public LearningCourse learning(Long courseId) {
        Course c = courses.findById(courseId).orElseThrow(() -> NotFoundException.of("Kursus", courseId));
        User user = currentUser.get();
        Optional<Enrollment> e = enrollments.findByUserIdAndCourseId(user.getId(), courseId);
        boolean preview = e.isEmpty();
        if (preview && !CourseService.canManage(user, c)) throw new AccessDeniedException("not enrolled");

        Set<Long> done = e.map(en -> progress.findByEnrollmentId(en.getId()).stream()
            .map(p -> p.getLesson().getId()).collect(Collectors.toSet())).orElse(Set.of());
        List<PlayerSection> sections = c.getSections().stream().map(s -> new PlayerSection(s.getId(), s.getTitle(),
            s.getLessons().stream().map(l -> new PlayerLesson(l.getId(), l.getTitle(), l.getType(), l.getDurationMinutes(),
                done.contains(l.getId()), false)).toList())).toList();
        int total = sections.stream().mapToInt(s -> s.lessons().size()).sum();
        int completed = (int) sections.stream().flatMap(s -> s.lessons().stream()).filter(PlayerLesson::completed).count();
        String cert = e.flatMap(en -> certificates.findByEnrollmentId(en.getId())).map(Certificate::getCode).orElse(null);
        return new LearningCourse(courseService.summary(c), sections, completed, total, percent(completed, total),
            e.map(Enrollment::getCompletedAt).orElse(null), cert, preview);
    }

    @Transactional(readOnly = true)
    public LessonContent lesson(Long lessonId) {
        Lesson l = lessons.findById(lessonId).orElseThrow(() -> NotFoundException.of("Materi", lessonId));
        Course c = l.getSection().getCourse();
        User user = currentUser.get();
        Optional<Enrollment> e = enrollments.findByUserIdAndCourseId(user.getId(), c.getId());
        boolean preview = e.isEmpty();
        if (preview && !CourseService.canManage(user, c)) throw new AccessDeniedException("not enrolled");
        return content(l, e.orElse(null), preview);
    }

    /** Free-preview lessons of published courses, visible without login (video/text only). */
    @Transactional(readOnly = true)
    public LessonContent publicPreview(Long lessonId) {
        Lesson l = lessons.findById(lessonId).orElseThrow(() -> NotFoundException.of("Materi", lessonId));
        boolean allowed = l.isFreePreview() && l.getSection().getCourse().getStatus() == CourseStatus.PUBLISHED
            && (l.getType() == LessonType.VIDEO || l.getType() == LessonType.TEXT);
        if (!allowed) throw NotFoundException.of("Materi", lessonId);
        return new LessonContent(l.getId(), l.getTitle(), l.getType(), l.getDurationMinutes(), l.getVideoUrl(),
            l.getContent(), false, null, null, null, List.of(), false, List.of(), List.of(), null, null, true);
    }

    @Transactional(readOnly = true)
    public Path lessonFile(Long lessonId) {
        Lesson l = lessons.findById(lessonId).orElseThrow(() -> NotFoundException.of("Materi", lessonId));
        requireAccess(l.getSection().getCourse());
        Path path = files.resolve(CourseService.LESSON_FILES, l.getFileName());
        if (path == null) throw new NotFoundException("File materi tidak ditemukan");
        return path;
    }

    // =================== progress ===================

    @Transactional
    public CompletionResponse complete(Long lessonId) {
        Lesson l = lessons.findById(lessonId).orElseThrow(() -> NotFoundException.of("Materi", lessonId));
        Enrollment e = requireEnrollment(l.getSection().getCourse());
        if (l.getType() == LessonType.QUIZ) throw new BusinessException("Kuis selesai otomatis setelah Anda lulus");
        if (l.getType() == LessonType.ASSIGNMENT) throw new BusinessException("Tugas selesai otomatis setelah Anda mengumpulkan file");
        markDone(e, l);
        return completion(e);
    }

    @Transactional
    public QuizResult submitQuiz(Long lessonId, QuizSubmitRequest request) {
        Lesson l = lessons.findById(lessonId).orElseThrow(() -> NotFoundException.of("Materi", lessonId));
        if (l.getType() != LessonType.QUIZ) throw new BusinessException("Materi ini bukan kuis");
        Enrollment e = requireEnrollment(l.getSection().getCourse());
        if (l.getQuestions().isEmpty()) throw new BusinessException("Kuis belum memiliki soal");

        List<QuestionResult> results = new ArrayList<>();
        int correct = 0;
        for (QuizQuestion q : l.getQuestions()) {
            Long chosen = request.answers().get(q.getId());
            Long right = q.getOptions().stream().filter(QuizOption::isCorrect).map(QuizOption::getId).findFirst().orElse(null);
            boolean ok = chosen != null && chosen.equals(right);
            if (ok) correct++;
            results.add(new QuestionResult(q.getId(), chosen, right, ok, q.getExplanation()));
        }
        int total = l.getQuestions().size();
        int score = Math.round(correct * 100f / total);
        int passing = l.getPassingScore() == null ? 70 : l.getPassingScore();
        boolean passed = score >= passing;
        attempts.save(QuizAttempt.builder().enrollment(e).lesson(l).score(score).correctCount(correct).totalCount(total)
            .passed(passed).answers(toJson(request.answers())).submittedAt(OffsetDateTime.now()).build());
        if (passed) markDone(e, l);
        CompletionResponse completion = completion(e);
        return new QuizResult(score, correct, total, passed, passing, results, completion.courseCompleted(), completion.certificateCode());
    }

    @Transactional
    public SubmissionResponse submitAssignment(Long lessonId, MultipartFile file, String note) {
        Lesson l = lessons.findById(lessonId).orElseThrow(() -> NotFoundException.of("Materi", lessonId));
        if (l.getType() != LessonType.ASSIGNMENT) throw new BusinessException("Materi ini bukan tugas");
        Enrollment e = requireEnrollment(l.getSection().getCourse());
        FileStorageService.Stored stored = files.store(SUBMISSIONS, "submission", file, FileStorageService.Kind.ASSIGNMENT);
        AssignmentSubmission s = submissions.save(AssignmentSubmission.builder()
            .enrollment(e).lesson(l).fileName(stored.name())
            .originalFileName(CourseService.safeOriginalName(file.getOriginalFilename(), "tugas." + stored.extension()))
            .note(note == null || note.isBlank() ? null : note.trim().substring(0, Math.min(note.trim().length(), 2000)))
            .status(SubmissionStatus.SUBMITTED).submittedAt(OffsetDateTime.now()).build());
        markDone(e, l);
        completion(e); // may issue the certificate when this was the last lesson
        return SubmissionResponse.from(s);
    }

    // =================== instructor: submissions & students ===================

    @Transactional(readOnly = true)
    public List<SubmissionResponse> submissionsForMe() {
        User u = currentUser.get();
        List<AssignmentSubmission> list = CurrentUser.isAdmin(u) ? submissions.findAllNewestFirst() : submissions.findForInstructor(u.getId());
        return list.stream().map(SubmissionResponse::from).toList();
    }

    @Transactional
    public SubmissionResponse grade(Long submissionId, GradeRequest request) {
        AssignmentSubmission s = submissions.findById(submissionId).orElseThrow(() -> NotFoundException.of("Tugas", submissionId));
        courseService.managed(s.getLesson().getSection().getCourse().getId());
        s.setGrade(request.grade());
        s.setFeedback(AuthService.blankToNull(request.feedback()));
        s.setStatus(SubmissionStatus.GRADED);
        s.setGradedAt(OffsetDateTime.now());
        s.setGradedBy(CurrentUser.name());
        return SubmissionResponse.from(submissions.save(s));
    }

    /** Download a submitted file: the student who sent it, the course instructor, or an admin. */
    @Transactional(readOnly = true)
    public Map.Entry<Path, String> submissionFile(Long submissionId) {
        AssignmentSubmission s = submissions.findById(submissionId).orElseThrow(() -> NotFoundException.of("Tugas", submissionId));
        User u = currentUser.get();
        boolean owner = s.getEnrollment().getUser().getId().equals(u.getId());
        if (!owner && !CourseService.canManage(u, s.getLesson().getSection().getCourse())) throw new AccessDeniedException("no access");
        Path path = files.resolve(SUBMISSIONS, s.getFileName());
        if (path == null) throw new NotFoundException("File tugas tidak ditemukan");
        return Map.entry(path, s.getOriginalFileName());
    }

    @Transactional(readOnly = true)
    public List<CourseStudent> students(Long courseId) {
        Course c = courseService.managed(courseId);
        long total = lessons.countByCourseId(c.getId());
        return enrollments.findByCourseIdOrderByEnrolledAtDesc(courseId).stream()
            .map(e -> new CourseStudent(e.getUser().getId(), e.getUser().getFullName(), e.getUser().getEmail(),
                e.getEnrolledAt(), percent((int) progress.countByEnrollmentId(e.getId()), (int) total), e.getCompletedAt()))
            .toList();
    }

    // =================== certificates ===================

    @Transactional(readOnly = true)
    public List<CertificateResponse> myCertificates() {
        return certificates.findByUserId(currentUser.get().getId()).stream().map(CertificateResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CertificateResponse verify(String code) {
        return certificates.findByCode(code.trim().toUpperCase(Locale.ROOT)).map(CertificateResponse::from)
            .orElseThrow(() -> new NotFoundException("Sertifikat tidak ditemukan"));
    }

    // =================== internals ===================

    private void markDone(Enrollment e, Lesson l) {
        if (!progress.existsByEnrollmentIdAndLessonId(e.getId(), l.getId())) {
            progress.save(LessonProgress.builder().enrollment(e).lesson(l).completedAt(OffsetDateTime.now()).build());
        }
    }

    /** Recomputes progress and issues the certificate the first time every lesson is complete. */
    private CompletionResponse completion(Enrollment e) {
        int total = (int) lessons.countByCourseId(e.getCourse().getId());
        int done = (int) progress.countByEnrollmentId(e.getId());
        boolean complete = total > 0 && done >= total;
        String code = certificates.findByEnrollmentId(e.getId()).map(Certificate::getCode).orElse(null);
        if (complete && code == null) {
            e.setCompletedAt(OffsetDateTime.now());
            enrollments.save(e);
            Certificate cert = certificates.save(Certificate.builder()
                .code(newCode()).enrollment(e).studentName(e.getUser().getFullName())
                .courseTitle(e.getCourse().getTitle()).instructorName(e.getCourse().getInstructor().getFullName())
                .issuedAt(OffsetDateTime.now()).build());
            code = cert.getCode();
        }
        return new CompletionResponse(true, percent(done, total), complete, code);
    }

    private LessonContent content(Lesson l, Enrollment e, boolean preview) {
        Course c = l.getSection().getCourse();
        List<Lesson> ordered = c.getSections().stream().flatMap(s -> s.getLessons().stream()).toList();
        int idx = ordered.indexOf(l);
        Long prev = idx > 0 ? ordered.get(idx - 1).getId() : null;
        Long next = idx >= 0 && idx < ordered.size() - 1 ? ordered.get(idx + 1).getId() : null;

        List<StudentQuestion> questions = l.getType() != LessonType.QUIZ ? List.of() : l.getQuestions().stream()
            .map(q -> new StudentQuestion(q.getId(), q.getText(),
                q.getOptions().stream().map(o -> new StudentOption(o.getId(), o.getText())).toList()))
            .toList();
        boolean completed = e != null && progress.existsByEnrollmentIdAndLessonId(e.getId(), l.getId());
        List<AttemptSummary> attemptList = e == null || l.getType() != LessonType.QUIZ ? List.of()
            : attempts.findByEnrollmentIdAndLessonIdOrderBySubmittedAtDesc(e.getId(), l.getId()).stream().map(AttemptSummary::from).toList();
        List<SubmissionResponse> subs = e == null || l.getType() != LessonType.ASSIGNMENT ? List.of()
            : submissions.findByEnrollmentIdAndLessonIdOrderBySubmittedAtDesc(e.getId(), l.getId()).stream().map(SubmissionResponse::from).toList();

        return new LessonContent(l.getId(), l.getTitle(), l.getType(), l.getDurationMinutes(), l.getVideoUrl(),
            l.getContent(), l.getFileName() != null, l.getOriginalFileName(), l.getPassingScore(),
            l.getAssignmentInstructions(), questions, completed, attemptList, subs, prev, next, preview);
    }

    private MyCourse myCourse(Enrollment e) {
        int total = (int) lessons.countByCourseId(e.getCourse().getId());
        int done = (int) progress.countByEnrollmentId(e.getId());
        String cert = certificates.findByEnrollmentId(e.getId()).map(Certificate::getCode).orElse(null);
        CourseDtos.CourseSummary summary = courseService.summary(e.getCourse());
        return new MyCourse(summary, done, total, percent(done, total), e.getEnrolledAt(), e.getCompletedAt(), cert);
    }

    private void requireAccess(Course c) {
        User u = currentUser.get();
        if (!enrollments.existsByUserIdAndCourseId(u.getId(), c.getId()) && !CourseService.canManage(u, c)) {
            throw new AccessDeniedException("not enrolled");
        }
    }

    private Enrollment requireEnrollment(Course c) {
        return enrollments.findByUserIdAndCourseId(currentUser.get().getId(), c.getId())
            .orElseThrow(() -> new BusinessException("Anda belum terdaftar di kursus ini"));
    }

    private static int percent(int done, int total) {
        return total == 0 ? 0 : Math.min(100, Math.round(done * 100f / total));
    }

    private String toJson(Object o) {
        try {
            return json.writeValueAsString(o);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    static String newCode() {
        StringBuilder sb = new StringBuilder("LMS-");
        for (int i = 0; i < 10; i++) sb.append(CODE_CHARS[RANDOM.nextInt(CODE_CHARS.length)]);
        return sb.toString();
    }
}
