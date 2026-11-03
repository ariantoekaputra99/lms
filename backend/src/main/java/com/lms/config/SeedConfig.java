package com.lms.config;

import com.lms.entity.*;
import com.lms.repository.CategoryRepository;
import com.lms.repository.CourseRepository;
import com.lms.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Configuration
public class SeedConfig {
    /** CC0 sample clip from MDN, used only for demo video lessons. */
    private static final String SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

    @Bean
    CommandLineRunner seed(UserRepository users, CategoryRepository categories, CourseRepository courses,
                           PasswordEncoder encoder, TransactionTemplate tx,
                           @Value("${app.seed.admin-email}") String adminEmail,
                           @Value("${app.seed.admin-password}") String adminPassword,
                           @Value("${app.seed.demo-data:false}") boolean demo) {
        return args -> tx.executeWithoutResult(status -> {
            if (users.findByEmailIgnoreCase(adminEmail).isEmpty()) {
                users.save(User.builder().email(adminEmail.toLowerCase()).fullName("Administrator")
                    .password(encoder.encode(adminPassword)).role(Role.ADMIN).active(true).build());
                log.info("Seeded admin account {}", adminEmail);
            }
            if (!demo || courses.count() > 0) return;

            User instructor = users.save(User.builder().email("instruktur@lms.local").fullName("Rina Pratama")
                .headline("Senior Software Engineer").bio("10 tahun membangun aplikasi backend dan mengajar pemrograman.")
                .password(encoder.encode("instruktur123")).role(Role.INSTRUCTOR).active(true).build());
            users.save(User.builder().email("siswa@lms.local").fullName("Budi Santoso")
                .password(encoder.encode("siswa12345")).role(Role.STUDENT).active(true).build());

            Category prog = categories.save(Category.builder().name("Pemrograman").slug("pemrograman").build());
            Category design = categories.save(Category.builder().name("Desain").slug("desain").build());
            categories.save(Category.builder().name("Bisnis").slug("bisnis").build());

            Course java = course(instructor, prog, "Dasar Pemrograman Java untuk Pemula", "dasar-pemrograman-java",
                "Mulai dari nol: variabel, percabangan, perulangan, dan OOP.", BigDecimal.ZERO, CourseLevel.BEGINNER,
                "Kursus ini mengajarkan dasar-dasar Java secara bertahap, cocok untuk Anda yang belum pernah menulis kode.",
                "Memahami sintaks dasar Java\nMenulis program dengan percabangan dan perulangan\nMengenal konsep OOP");
            Section intro = section(java, "Pengenalan", 1);
            lesson(intro, "Selamat datang di kursus", LessonType.VIDEO, 1, 3, true, l -> l.setVideoUrl(SAMPLE_VIDEO));
            lesson(intro, "Apa itu Java?", LessonType.TEXT, 2, 5, true, l -> l.setContent(
                "## Apa itu Java?\n\nJava adalah bahasa pemrograman berorientasi objek yang berjalan di JVM.\n\n"
                    + "- Ditulis sekali, jalan di mana saja\n- Dipakai untuk backend, Android, dan aplikasi enterprise\n\n"
                    + "```java\npublic class Halo {\n    public static void main(String[] args) {\n        System.out.println(\"Halo, dunia!\");\n    }\n}\n```"));
            Section practice = section(java, "Latihan", 2);
            lesson(practice, "Kuis dasar Java", LessonType.QUIZ, 1, 5, false, l -> {
                l.setPassingScore(60);
                question(l, 1, "Method apa yang pertama kali dijalankan program Java?", "Program Java dimulai dari method main.",
                    List.of("start()", "main()", "run()", "init()"), 1);
                question(l, 2, "Tipe data untuk bilangan bulat adalah...", null, List.of("int", "String", "boolean"), 0);
                question(l, 3, "Kata kunci untuk membuat objek baru adalah...", null, List.of("make", "class", "new"), 2);
            });
            lesson(practice, "Tugas: program kalkulator", LessonType.ASSIGNMENT, 2, 30, false, l -> l.setAssignmentInstructions(
                "Buat program kalkulator sederhana (tambah, kurang, kali, bagi). Kumpulkan file .zip berisi kode Anda atau PDF screenshot hasilnya."));
            courses.save(java);

            Course spring = course(instructor, prog, "Spring Boot REST API Profesional", "spring-boot-rest-api",
                "Bangun REST API siap produksi dengan Spring Boot, JPA, dan JWT.", BigDecimal.valueOf(149000), CourseLevel.INTERMEDIATE,
                "Pelajari cara membangun REST API yang aman dan mudah dirawat, lengkap dengan autentikasi JWT dan deployment Docker.",
                "Merancang REST API yang rapi\nMengamankan API dengan JWT\nDeploy dengan Docker");
            Section s1 = section(spring, "Fondasi", 1);
            lesson(s1, "Arsitektur aplikasi Spring Boot", LessonType.VIDEO, 1, 12, true, l -> l.setVideoUrl(SAMPLE_VIDEO));
            lesson(s1, "Membuat controller pertama", LessonType.TEXT, 2, 10, false, l -> l.setContent(
                "## Controller pertama\n\nGunakan anotasi `@RestController` dan `@GetMapping` untuk membuat endpoint."));
            Section s2 = section(spring, "Evaluasi", 2);
            lesson(s2, "Kuis REST API", LessonType.QUIZ, 1, 5, false, l -> {
                l.setPassingScore(70);
                question(l, 1, "HTTP method untuk membuat data baru adalah...", null, List.of("GET", "POST", "DELETE"), 1);
                question(l, 2, "Status code untuk resource tidak ditemukan adalah...", null, List.of("200", "404", "500"), 1);
            });
            courses.save(spring);

            Course figma = course(instructor, design, "Desain UI dengan Figma", "desain-ui-figma",
                "Dari wireframe hingga prototipe interaktif.", BigDecimal.valueOf(99000), CourseLevel.BEGINNER,
                "Kuasai Figma untuk mendesain antarmuka aplikasi yang rapi dan konsisten.",
                "Menggunakan auto layout\nMembuat komponen dan varian\nMembuat prototipe interaktif");
            Section f1 = section(figma, "Mulai", 1);
            lesson(f1, "Tur antarmuka Figma", LessonType.VIDEO, 1, 8, true, l -> l.setVideoUrl(SAMPLE_VIDEO));
            lesson(f1, "Prinsip layout", LessonType.TEXT, 2, 6, false, l -> l.setContent("## Prinsip layout\n\nGunakan grid 8pt dan spasi yang konsisten."));
            courses.save(figma);
            log.info("Seeded demo data: instruktur@lms.local / instruktur123, siswa@lms.local / siswa12345");
        });
    }

    private static Course course(User instructor, Category category, String title, String slug, String subtitle,
                                 BigDecimal price, CourseLevel level, String description, String learn) {
        return Course.builder().instructor(instructor).category(category).title(title).slug(slug).subtitle(subtitle)
            .price(price.setScale(2)).level(level).description(description).whatYouLearn(learn)
            .status(CourseStatus.PUBLISHED).publishedAt(OffsetDateTime.now()).build();
    }

    private static Section section(Course c, String title, int position) {
        Section s = Section.builder().course(c).title(title).position(position).build();
        c.getSections().add(s);
        return s;
    }

    private static void lesson(Section s, String title, LessonType type, int position, int minutes, boolean preview,
                               java.util.function.Consumer<Lesson> customize) {
        Lesson l = Lesson.builder().section(s).title(title).type(type).position(position).durationMinutes(minutes)
            .freePreview(preview).build();
        customize.accept(l);
        s.getLessons().add(l);
    }

    private static void question(Lesson l, int position, String text, String explanation, List<String> options, int correct) {
        QuizQuestion q = QuizQuestion.builder().lesson(l).text(text).explanation(explanation).position(position).build();
        for (int i = 0; i < options.size(); i++) {
            q.getOptions().add(QuizOption.builder().question(q).text(options.get(i)).correct(i == correct).position(i + 1).build());
        }
        l.getQuestions().add(q);
    }
}
