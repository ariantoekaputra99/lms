package com.lms.service;

import com.lms.dto.CourseDtos.*;
import com.lms.entity.*;
import com.lms.exception.BusinessException;
import com.lms.exception.NotFoundException;
import com.lms.repository.*;
import com.lms.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CourseService {
    public static final String THUMBNAILS = "thumbnails";
    public static final String LESSON_FILES = "lesson-files";

    private final CourseRepository courses;
    private final SectionRepository sections;
    private final LessonRepository lessons;
    private final CategoryRepository categories;
    private final EnrollmentRepository enrollments;
    private final FileStorageService files;
    private final CurrentUser currentUser;

    // =================== public catalogue ===================

    @Transactional(readOnly = true)
    public List<CourseSummary> catalog(String q, String category, CourseLevel level, String price, String sort) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        Stream<Course> stream = courses.findByStatusOrderByPublishedAtDesc(CourseStatus.PUBLISHED).stream()
            .filter(c -> needle.isEmpty() || (c.getTitle() + " " + Objects.toString(c.getSubtitle(), "") + " "
                + c.getInstructor().getFullName()).toLowerCase(Locale.ROOT).contains(needle))
            .filter(c -> category == null || category.isBlank()
                || (c.getCategory() != null && c.getCategory().getSlug().equals(category)))
            .filter(c -> level == null || c.getLevel() == level)
            .filter(c -> price == null || price.isBlank() || ("free".equals(price) ? c.isFree() : !c.isFree()));
        List<CourseSummary> list = stream.map(this::summary).toList();
        Comparator<CourseSummary> order = switch (sort == null ? "" : sort) {
            case "popular" -> Comparator.comparingLong(CourseSummary::studentCount).reversed();
            case "price_asc" -> Comparator.comparing(CourseSummary::price);
            case "price_desc" -> Comparator.comparing(CourseSummary::price).reversed();
            default -> Comparator.comparing(CourseSummary::publishedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        };
        return list.stream().sorted(order).toList();
    }

    @Transactional(readOnly = true)
    public CourseDetail detail(String slug) {
        Course c = courses.findBySlug(slug).orElseThrow(() -> NotFoundException.of("Kursus", slug));
        Optional<User> user = currentUser.optional();
        boolean canManage = user.map(u -> canManage(u, c)).orElse(false);
        if (c.getStatus() != CourseStatus.PUBLISHED && !canManage) {
            // Students who already bought an archived course can still see it.
            boolean enrolled = user.map(u -> enrollments.existsByUserIdAndCourseId(u.getId(), c.getId())).orElse(false);
            if (!enrolled) throw NotFoundException.of("Kursus", slug);
        }
        boolean enrolled = user.map(u -> enrollments.existsByUserIdAndCourseId(u.getId(), c.getId())).orElse(false);
        return CourseDetail.from(c, enrollments.countByCourseId(c.getId()), enrolled, canManage);
    }

    @Transactional(readOnly = true)
    public Path thumbnail(Long courseId) {
        Course c = courses.findById(courseId).orElseThrow(() -> NotFoundException.of("Kursus", courseId));
        Path path = files.resolve(THUMBNAILS, c.getThumbnailFile());
        if (path == null) throw new NotFoundException("Thumbnail tidak ditemukan");
        return path;
    }

    // =================== instructor: courses ===================

    @Transactional(readOnly = true)
    public List<CourseSummary> manageable() {
        User u = currentUser.get();
        List<Course> list = CurrentUser.isAdmin(u) ? courses.findAllByOrderByUpdatedAtDesc()
            : courses.findByInstructorIdOrderByUpdatedAtDesc(u.getId());
        return list.stream().map(this::summary).toList();
    }

    @Transactional
    public CourseEditor create(CourseRequest request) {
        User u = currentUser.get();
        Course c = Course.builder()
            .instructor(u)
            .status(CourseStatus.DRAFT)
            .slug(Slugs.unique(request.title(), courses::existsBySlug))
            .build();
        apply(c, request);
        return editor(courses.save(c));
    }

    @Transactional(readOnly = true)
    public CourseEditor editor(Long id) {
        return editor(managed(id));
    }

    @Transactional
    public CourseEditor update(Long id, CourseRequest request) {
        Course c = managed(id);
        apply(c, request);
        return editor(courses.save(c));
    }

    @Transactional
    public CourseEditor uploadThumbnail(Long id, MultipartFile file) {
        Course c = managed(id);
        FileStorageService.Stored stored = files.store(THUMBNAILS, "course", file, FileStorageService.Kind.IMAGE);
        String old = c.getThumbnailFile();
        c.setThumbnailFile(stored.name());
        courses.save(c);
        files.delete(THUMBNAILS, old);
        return editor(c);
    }

    @Transactional
    public CourseEditor publish(Long id) {
        Course c = managed(id);
        List<String> problems = publishProblems(c);
        if (!problems.isEmpty()) throw new BusinessException("Kursus belum bisa dipublikasikan: " + String.join("; ", problems));
        c.setStatus(CourseStatus.PUBLISHED);
        if (c.getPublishedAt() == null) c.setPublishedAt(OffsetDateTime.now());
        return editor(courses.save(c));
    }

    @Transactional
    public CourseEditor unpublish(Long id) {
        Course c = managed(id);
        c.setStatus(CourseStatus.DRAFT);
        return editor(courses.save(c));
    }

    @Transactional
    public CourseEditor archive(Long id) {
        Course c = managed(id);
        c.setStatus(CourseStatus.ARCHIVED);
        return editor(courses.save(c));
    }

    @Transactional
    public void delete(Long id) {
        Course c = managed(id);
        if (enrollments.countByCourseId(id) > 0) {
            throw new BusinessException("Kursus sudah punya siswa. Arsipkan saja agar siswa tetap bisa mengakses materinya");
        }
        files.delete(THUMBNAILS, c.getThumbnailFile());
        c.getSections().forEach(s -> s.getLessons().forEach(l -> files.delete(LESSON_FILES, l.getFileName())));
        courses.delete(c);
    }

    // =================== instructor: curriculum ===================

    @Transactional
    public CourseEditor addSection(Long courseId, SectionRequest request) {
        Course c = managed(courseId);
        Section s = Section.builder().course(c).title(request.title().trim())
            .position(c.getSections().stream().mapToInt(Section::getPosition).max().orElse(0) + 1).build();
        c.getSections().add(s);
        sections.save(s);
        return editor(c);
    }

    @Transactional
    public CourseEditor updateSection(Long sectionId, SectionRequest request) {
        Section s = managedSection(sectionId);
        s.setTitle(request.title().trim());
        sections.save(s);
        return editor(s.getCourse());
    }

    @Transactional
    public CourseEditor deleteSection(Long sectionId) {
        Section s = managedSection(sectionId);
        Course c = s.getCourse();
        s.getLessons().forEach(l -> files.delete(LESSON_FILES, l.getFileName()));
        c.getSections().remove(s);
        renumberSections(c);
        courses.save(c);
        return editor(c);
    }

    @Transactional
    public CourseEditor moveSection(Long sectionId, MoveRequest.Direction direction) {
        Section s = managedSection(sectionId);
        Course c = s.getCourse();
        swap(c.getSections(), s, direction, Section::getPosition, Section::setPosition);
        sections.saveAll(c.getSections());
        c.getSections().sort(Comparator.comparingInt(Section::getPosition));
        return editor(c);
    }

    @Transactional
    public CourseEditor addLesson(Long sectionId, LessonRequest request) {
        Section s = managedSection(sectionId);
        Lesson l = Lesson.builder().section(s)
            .position(s.getLessons().stream().mapToInt(Lesson::getPosition).max().orElse(0) + 1).build();
        apply(l, request);
        s.getLessons().add(l);
        lessons.save(l);
        return editor(s.getCourse());
    }

    @Transactional
    public CourseEditor updateLesson(Long lessonId, LessonRequest request) {
        Lesson l = managedLesson(lessonId);
        apply(l, request);
        lessons.save(l);
        return editor(l.getSection().getCourse());
    }

    @Transactional
    public CourseEditor deleteLesson(Long lessonId) {
        Lesson l = managedLesson(lessonId);
        Section s = l.getSection();
        files.delete(LESSON_FILES, l.getFileName());
        s.getLessons().remove(l);
        for (int i = 0; i < s.getLessons().size(); i++) s.getLessons().get(i).setPosition(i + 1);
        sections.save(s);
        return editor(s.getCourse());
    }

    @Transactional
    public CourseEditor moveLesson(Long lessonId, MoveRequest.Direction direction) {
        Lesson l = managedLesson(lessonId);
        Section s = l.getSection();
        swap(s.getLessons(), l, direction, Lesson::getPosition, Lesson::setPosition);
        lessons.saveAll(s.getLessons());
        s.getLessons().sort(Comparator.comparingInt(Lesson::getPosition));
        return editor(s.getCourse());
    }

    @Transactional
    public CourseEditor uploadLessonFile(Long lessonId, MultipartFile file) {
        Lesson l = managedLesson(lessonId);
        if (l.getType() != LessonType.PDF) throw new BusinessException("Upload file hanya untuk materi PDF");
        FileStorageService.Stored stored = files.store(LESSON_FILES, "lesson", file, FileStorageService.Kind.PDF);
        String old = l.getFileName();
        l.setFileName(stored.name());
        l.setOriginalFileName(safeOriginalName(file.getOriginalFilename(), "materi.pdf"));
        lessons.save(l);
        files.delete(LESSON_FILES, old);
        return editor(l.getSection().getCourse());
    }

    @Transactional
    public CourseEditor saveQuiz(Long lessonId, QuizRequest request) {
        Lesson l = managedLesson(lessonId);
        if (l.getType() != LessonType.QUIZ) throw new BusinessException("Soal hanya bisa ditambahkan ke materi kuis");
        for (int i = 0; i < request.questions().size(); i++) {
            long correct = request.questions().get(i).options().stream().filter(QuizRequest.Option::correct).count();
            if (correct != 1) throw new BusinessException("Soal nomor " + (i + 1) + " harus punya tepat satu jawaban benar");
        }
        l.getQuestions().clear();
        lessons.saveAndFlush(l);
        int qPos = 1;
        for (QuizRequest.Question q : request.questions()) {
            QuizQuestion question = QuizQuestion.builder().lesson(l).text(q.text().trim())
                .explanation(AuthService.blankToNull(q.explanation())).position(qPos++).build();
            int oPos = 1;
            for (QuizRequest.Option o : q.options()) {
                question.getOptions().add(QuizOption.builder().question(question).text(o.text().trim())
                    .correct(o.correct()).position(oPos++).build());
            }
            l.getQuestions().add(question);
        }
        lessons.save(l);
        return editor(l.getSection().getCourse());
    }

    // =================== access helpers (also used by other services) ===================

    public static boolean canManage(User u, Course c) {
        return CurrentUser.isAdmin(u) || c.getInstructor().getId().equals(u.getId());
    }

    public Course managed(Long courseId) {
        Course c = courses.findById(courseId).orElseThrow(() -> NotFoundException.of("Kursus", courseId));
        if (!canManage(currentUser.get(), c)) throw new org.springframework.security.access.AccessDeniedException("not owner");
        return c;
    }

    private Section managedSection(Long id) {
        Section s = sections.findById(id).orElseThrow(() -> NotFoundException.of("Bagian", id));
        managed(s.getCourse().getId());
        return s;
    }

    private Lesson managedLesson(Long id) {
        Lesson l = lessons.findById(id).orElseThrow(() -> NotFoundException.of("Materi", id));
        managed(l.getSection().getCourse().getId());
        return l;
    }

    public CourseSummary summary(Course c) {
        return CourseSummary.from(c, enrollments.countByCourseId(c.getId()));
    }

    private CourseEditor editor(Course c) {
        return new CourseEditor(summary(c), c.getDescription(), c.getWhatYouLearn(),
            c.getCategory() == null ? null : c.getCategory().getId(),
            c.getSections().stream().map(EditorSection::from).toList(), publishProblems(c));
    }

    /** Human-readable reasons a course cannot be published yet (empty = ready). */
    public static List<String> publishProblems(Course c) {
        List<String> problems = new ArrayList<>();
        if (c.getDescription() == null || c.getDescription().isBlank()) problems.add("deskripsi kursus masih kosong");
        List<Lesson> all = c.getSections().stream().flatMap(s -> s.getLessons().stream()).toList();
        if (all.isEmpty()) problems.add("belum ada materi");
        for (Lesson l : all) {
            switch (l.getType()) {
                case VIDEO -> { if (l.getVideoUrl() == null || l.getVideoUrl().isBlank()) problems.add("video \"" + l.getTitle() + "\" belum punya URL"); }
                case TEXT -> { if (l.getContent() == null || l.getContent().isBlank()) problems.add("materi \"" + l.getTitle() + "\" masih kosong"); }
                case PDF -> { if (l.getFileName() == null) problems.add("materi PDF \"" + l.getTitle() + "\" belum ada file"); }
                case QUIZ -> { if (l.getQuestions().isEmpty()) problems.add("kuis \"" + l.getTitle() + "\" belum punya soal"); }
                case ASSIGNMENT -> { if (l.getAssignmentInstructions() == null || l.getAssignmentInstructions().isBlank()) problems.add("tugas \"" + l.getTitle() + "\" belum punya instruksi"); }
            }
        }
        return problems;
    }

    private void apply(Course c, CourseRequest r) {
        c.setTitle(r.title().trim());
        c.setSubtitle(AuthService.blankToNull(r.subtitle()));
        c.setDescription(AuthService.blankToNull(r.description()));
        c.setWhatYouLearn(AuthService.blankToNull(r.whatYouLearn()));
        c.setLevel(r.level());
        c.setPrice(r.price().setScale(0, RoundingMode.HALF_UP).setScale(2));
        if (c.getPrice().signum() > 0 && c.getPrice().compareTo(BigDecimal.valueOf(1000)) < 0) {
            throw new BusinessException("Harga kursus berbayar minimal Rp 1.000 (atau 0 untuk gratis)");
        }
        c.setCategory(r.categoryId() == null ? null
            : categories.findById(r.categoryId()).orElseThrow(() -> NotFoundException.of("Kategori", r.categoryId())));
    }

    private static void apply(Lesson l, LessonRequest r) {
        l.setTitle(r.title().trim());
        if (l.getId() != null && l.getType() != r.type() && (l.getFileName() != null || !l.getQuestions().isEmpty())) {
            throw new BusinessException("Jenis materi tidak bisa diubah setelah berisi file atau soal. Hapus lalu buat ulang materi");
        }
        l.setType(r.type());
        l.setDurationMinutes(r.durationMinutes());
        l.setFreePreview(r.freePreview());
        String url = AuthService.blankToNull(r.videoUrl());
        if (r.type() == LessonType.VIDEO && url != null && !url.matches("(?i)^https?://.+")) {
            throw new BusinessException("URL video harus diawali http:// atau https://");
        }
        l.setVideoUrl(r.type() == LessonType.VIDEO ? url : null);
        l.setContent(r.type() == LessonType.TEXT || r.type() == LessonType.VIDEO || r.type() == LessonType.PDF
            ? AuthService.blankToNull(r.content()) : null);
        l.setPassingScore(r.type() == LessonType.QUIZ ? (r.passingScore() == null ? 70 : r.passingScore()) : null);
        l.setAssignmentInstructions(r.type() == LessonType.ASSIGNMENT ? AuthService.blankToNull(r.assignmentInstructions()) : null);
    }

    private static void renumberSections(Course c) {
        for (int i = 0; i < c.getSections().size(); i++) c.getSections().get(i).setPosition(i + 1);
    }

    private static <T> void swap(List<T> list, T item, MoveRequest.Direction dir,
                                 java.util.function.ToIntFunction<T> pos, java.util.function.ObjIntConsumer<T> setPos) {
        List<T> sorted = new ArrayList<>(list);
        sorted.sort(Comparator.comparingInt(pos));
        int i = sorted.indexOf(item);
        int j = dir == MoveRequest.Direction.UP ? i - 1 : i + 1;
        if (j < 0 || j >= sorted.size()) return;
        T other = sorted.get(j);
        int a = pos.applyAsInt(item);
        setPos.accept(item, pos.applyAsInt(other));
        setPos.accept(other, a);
    }

    static String safeOriginalName(String name, String fallback) {
        if (name == null || name.isBlank()) return fallback;
        String base = Path.of(name.replace('\\', '/')).getFileName().toString();
        base = base.replaceAll("[\\r\\n\"]", "_");
        return base.length() > 200 ? base.substring(base.length() - 200) : base;
    }
}
