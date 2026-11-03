package com.lms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class LmsFlowIntegrationTest {
    static final byte[] PDF = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    static final byte[] ZIP = {'P', 'K', 3, 4, 20, 0, 0, 0, 0, 0};

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    String admin, instructor, student;

    @BeforeEach
    void users() throws Exception {
        admin = login("admin@lms.local", "admin12345");
        instructor = register("Rina Instruktur", "rina@x.com", true);
        student = register("Budi Siswa", "budi@x.com", false);
    }

    @Test
    void registrationRules() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("fullName", "X", "email", "BUDI@x.com", "password", "rahasia123"))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Email sudah terdaftar"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("fullName", "X", "email", "y@x.com", "password", "short"))))
            .andExpect(status().isBadRequest());
        call(get("/api/auth/me"), student, null).andExpect(jsonPath("$.role").value("STUDENT"));
        call(get("/api/auth/me"), instructor, null).andExpect(jsonPath("$.role").value("INSTRUCTOR"));
        call(get("/api/instructor/courses"), student, null).andExpect(status().isForbidden());
        call(get("/api/admin/stats"), instructor, null).andExpect(status().isForbidden());
        mvc.perform(get("/api/me/courses")).andExpect(status().isUnauthorized());
    }

    @Test
    void fullLearningFlowWithQuizAssignmentAndCertificate() throws Exception {
        long courseId = createCourse("Belajar Testing", 0);
        JsonNode editor = body(call(post("/api/instructor/courses/" + courseId + "/sections"), instructor, Map.of("title", "Bab 1")));
        long sectionId = editor.get("sections").get(0).get("id").asLong();

        lesson(sectionId, Map.of("title", "Teori", "type", "TEXT", "content", "Isi materi", "freePreview", true));
        lesson(sectionId, Map.of("title", "Modul PDF", "type", "PDF"));
        lesson(sectionId, Map.of("title", "Kuis", "type", "QUIZ", "passingScore", 100));
        editor = lesson(sectionId, Map.of("title", "Tugas", "type", "ASSIGNMENT", "assignmentInstructions", "Kumpulkan kode"));
        JsonNode lessons = editor.get("sections").get(0).get("lessons");
        long textId = lessons.get(0).get("id").asLong(), pdfId = lessons.get(1).get("id").asLong();
        long quizId = lessons.get(2).get("id").asLong(), taskId = lessons.get(3).get("id").asLong();

        // Not publishable yet: PDF has no file and quiz has no questions.
        assertThat(editor.get("publishProblems").toString()).contains("belum ada file").contains("belum punya soal");
        call(post("/api/instructor/courses/" + courseId + "/publish"), instructor, null).andExpect(status().isBadRequest());

        upload(multipart("/api/instructor/lessons/" + pdfId + "/file"), instructor,
            new MockMultipartFile("file", "modul.pdf", "application/pdf", PDF)).andExpect(status().isOk());
        upload(multipart("/api/instructor/lessons/" + textId + "/file"), instructor,
            new MockMultipartFile("file", "x.pdf", "application/pdf", PDF)).andExpect(status().isBadRequest());
        call(put("/api/instructor/lessons/" + quizId + "/quiz"), instructor, Map.of("questions", List.of(
            Map.of("text", "2+2?", "options", List.of(Map.of("text", "3", "correct", true), Map.of("text", "4", "correct", true))))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message", containsString("tepat satu")));
        JsonNode quizEditor = body(call(put("/api/instructor/lessons/" + quizId + "/quiz"), instructor, Map.of("questions", List.of(
            Map.of("text", "2+2?", "explanation", "Dasar", "options", List.of(Map.of("text", "3", "correct", false), Map.of("text", "4", "correct", true))),
            Map.of("text", "Ibu kota RI?", "options", List.of(Map.of("text", "Jakarta", "correct", true), Map.of("text", "Bandung", "correct", false))))))
            .andExpect(status().isOk()));
        JsonNode questions = quizEditor.get("sections").get(0).get("lessons").get(2).get("questions");
        call(post("/api/instructor/courses/" + courseId + "/publish"), instructor, null)
            .andExpect(status().isOk()).andExpect(jsonPath("$.course.status").value("PUBLISHED"));

        // Public view exposes the outline only.
        String publicDetail = mvc.perform(get("/api/public/courses/belajar-testing")).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        assertThat(publicDetail).contains("Teori").doesNotContain("Isi materi").doesNotContain("correct");
        mvc.perform(get("/api/public/lessons/" + textId + "/preview")).andExpect(jsonPath("$.content").value("Isi materi"));
        mvc.perform(get("/api/public/lessons/" + quizId + "/preview")).andExpect(status().isNotFound());
        assertThat(body(mvc.perform(get("/api/public/courses")))).hasSize(1);

        // Before enrolling the student cannot open lessons or files.
        call(get("/api/learn/lessons/" + textId), student, null).andExpect(status().isForbidden());
        call(get("/api/learn/lessons/" + pdfId + "/file"), student, null).andExpect(status().isForbidden());

        call(post("/api/courses/" + courseId + "/enroll"), student, null).andExpect(status().isOk())
            .andExpect(jsonPath("$.progressPercent").value(0));
        call(get("/api/learn/lessons/" + pdfId + "/file"), student, null).andExpect(status().isOk())
            .andExpect(content().bytes(PDF));

        // Quiz content never contains the answers.
        String quizJson = call(get("/api/learn/lessons/" + quizId), student, null).andReturn().getResponse().getContentAsString();
        assertThat(quizJson).doesNotContain("correct").contains("Ibu kota RI?");

        call(post("/api/learn/lessons/" + textId + "/complete"), student, null).andExpect(jsonPath("$.progressPercent").value(25));
        call(post("/api/learn/lessons/" + pdfId + "/complete"), student, null).andExpect(jsonPath("$.progressPercent").value(50));
        call(post("/api/learn/lessons/" + quizId + "/complete"), student, null).andExpect(status().isBadRequest());

        long q1 = questions.get(0).get("id").asLong(), q2 = questions.get(1).get("id").asLong();
        long q1Wrong = questions.get(0).get("options").get(0).get("id").asLong();
        long q1Right = questions.get(0).get("options").get(1).get("id").asLong();
        long q2Right = questions.get(1).get("options").get(0).get("id").asLong();
        JsonNode fail = body(call(post("/api/learn/lessons/" + quizId + "/quiz"), student, Map.of("answers", Map.of(q1, q1Wrong, q2, q2Right))));
        assertThat(fail.get("score").asInt()).isEqualTo(50);
        assertThat(fail.get("passed").asBoolean()).isFalse();
        assertThat(fail.get("results").get(0).get("correctOptionId").asLong()).isEqualTo(q1Right);
        JsonNode pass = body(call(post("/api/learn/lessons/" + quizId + "/quiz"), student, Map.of("answers", Map.of(q1, q1Right, q2, q2Right))));
        assertThat(pass.get("passed").asBoolean()).isTrue();
        assertThat(pass.get("courseCompleted").asBoolean()).isFalse();

        upload((MockMultipartHttpServletRequestBuilder) multipart("/api/learn/lessons/" + taskId + "/submission").param("note", "Selesai"), student,
            new MockMultipartFile("file", "script.sh", "text/plain", "#!/bin/sh".getBytes())).andExpect(status().isBadRequest());
        JsonNode sub = body(upload((MockMultipartHttpServletRequestBuilder) multipart("/api/learn/lessons/" + taskId + "/submission").param("note", "Selesai"), student,
            new MockMultipartFile("file", "../../tugas.docx", "application/octet-stream", ZIP)).andExpect(status().isOk()));
        assertThat(sub.get("originalFileName").asText()).isEqualTo("tugas.docx");

        JsonNode learning = body(call(get("/api/learn/courses/" + courseId), student, null));
        assertThat(learning.get("progressPercent").asInt()).isEqualTo(100);
        String code = learning.get("certificateCode").asText();
        assertThat(code).startsWith("LMS-");

        mvc.perform(get("/api/public/certificates/" + code)).andExpect(status().isOk())
            .andExpect(jsonPath("$.studentName").value("Budi Siswa")).andExpect(jsonPath("$.courseTitle").value("Belajar Testing"));
        byte[] certificate = mvc.perform(get("/api/public/certificates/" + code.toLowerCase() + "/pdf"))
            .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(certificate, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        mvc.perform(get("/api/public/certificates/LMS-TIDAKADA00")).andExpect(status().isNotFound());

        // Instructor grades; student can download their own file; other students cannot.
        long subId = body(call(get("/api/instructor/submissions"), instructor, null)).get(0).get("id").asLong();
        call(post("/api/instructor/submissions/" + subId + "/grade"), instructor, Map.of("grade", 90, "feedback", "Bagus"))
            .andExpect(jsonPath("$.status").value("GRADED"));
        call(get("/api/submissions/" + subId + "/file"), student, null).andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", containsString("tugas.docx")));
        String other = register("Orang Lain", "lain@x.com", false);
        call(get("/api/submissions/" + subId + "/file"), other, null).andExpect(status().isForbidden());

        assertThat(body(call(get("/api/instructor/courses/" + courseId + "/students"), instructor, null)).get(0)
            .get("progressPercent").asInt()).isEqualTo(100);
        assertThat(body(call(get("/api/me/certificates"), student, null))).hasSize(1);
        call(delete("/api/instructor/courses/" + courseId), instructor, null).andExpect(status().isBadRequest());
    }

    @Test
    void paidCourseRequiresPaymentThroughSimulator() throws Exception {
        long courseId = publishedCourse("Kursus Premium", 150000);
        call(post("/api/courses/" + courseId + "/enroll"), student, null).andExpect(status().isBadRequest());

        JsonNode checkout = body(call(post("/api/courses/" + courseId + "/checkout"), student, null).andExpect(status().isOk()));
        assertThat(checkout.get("enrolled").asBoolean()).isFalse();
        assertThat(checkout.get("provider").asText()).isEqualTo("SIMULATOR");
        String code = checkout.get("orderCode").asText();
        assertThat(checkout.get("redirectUrl").asText()).endsWith("/checkout/simulate/" + code);
        // Repeated checkout reuses the pending order.
        assertThat(body(call(post("/api/courses/" + courseId + "/checkout"), student, null)).get("orderCode").asText()).isEqualTo(code);

        String other = register("Orang Lain", "lain@x.com", false);
        call(post("/api/orders/" + code + "/simulate"), other, null).andExpect(status().isForbidden());
        call(get("/api/learn/courses/" + courseId), student, null).andExpect(status().isForbidden());

        call(post("/api/orders/" + code + "/simulate"), student, null).andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PAID"));
        call(get("/api/learn/courses/" + courseId), student, null).andExpect(status().isOk());
        assertThat(body(call(post("/api/courses/" + courseId + "/checkout"), student, null)).get("enrolled").asBoolean()).isTrue();

        JsonNode stats = body(call(get("/api/admin/stats"), admin, null));
        assertThat(stats.get("revenue").decimalValue()).isEqualByComparingTo("150000");
        assertThat(body(call(get("/api/instructor/stats"), instructor, null)).get("revenue").decimalValue()).isEqualByComparingTo("150000");

        // Webhook is rejected when Midtrans is not configured.
        mvc.perform(post("/api/payments/midtrans/notification").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("order_id", code, "transaction_status", "settlement"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void instructorsCannotTouchOtherInstructorsCourses() throws Exception {
        long courseId = createCourse("Milik Rina", 0);
        String other = register("Instruktur Lain", "lain@x.com", true);
        call(get("/api/instructor/courses/" + courseId), other, null).andExpect(status().isForbidden());
        call(put("/api/instructor/courses/" + courseId), other, courseBody("Dibajak", 0)).andExpect(status().isForbidden());
        call(post("/api/instructor/courses/" + courseId + "/sections"), other, Map.of("title", "X")).andExpect(status().isForbidden());
        assertThat(body(call(get("/api/instructor/courses"), other, null))).isEmpty();
        // Admin can manage everything; drafts are hidden from the public.
        call(get("/api/instructor/courses/" + courseId), admin, null).andExpect(status().isOk());
        mvc.perform(get("/api/public/courses/milik-rina")).andExpect(status().isNotFound());
        call(get("/api/public/courses/milik-rina"), instructor, null).andExpect(status().isOk())
            .andExpect(jsonPath("$.canManage").value(true));
    }

    @Test
    void curriculumOrderingAndThumbnail() throws Exception {
        long courseId = createCourse("Urutan", 0);
        call(post("/api/instructor/courses/" + courseId + "/sections"), instructor, Map.of("title", "A"));
        JsonNode e = body(call(post("/api/instructor/courses/" + courseId + "/sections"), instructor, Map.of("title", "B")));
        long b = e.get("sections").get(1).get("id").asLong();
        e = body(call(post("/api/instructor/sections/" + b + "/move"), instructor, Map.of("direction", "UP")));
        assertThat(e.get("sections").get(0).get("title").asText()).isEqualTo("B");

        byte[] png = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0};
        upload(multipart("/api/instructor/courses/" + courseId + "/thumbnail"), instructor,
            new MockMultipartFile("file", "x.png", "image/png", "<svg/>".getBytes())).andExpect(status().isBadRequest());
        JsonNode withThumb = body(upload(multipart("/api/instructor/courses/" + courseId + "/thumbnail"), instructor,
            new MockMultipartFile("file", "x.png", "image/png", png)).andExpect(status().isOk()));
        String url = withThumb.get("course").get("thumbnailUrl").asText();
        mvc.perform(get("/api" + url)).andExpect(status().isOk()).andExpect(content().bytes(png));
    }

    @Test
    void adminManagesUsersAndCategories() throws Exception {
        JsonNode users = body(call(get("/api/admin/users"), admin, null));
        long studentId = 0, adminId = 0;
        for (JsonNode u : users) {
            if (u.get("email").asText().equals("budi@x.com")) studentId = u.get("id").asLong();
            if (u.get("email").asText().equals("admin@lms.local")) adminId = u.get("id").asLong();
        }
        call(put("/api/admin/users/" + adminId), admin, Map.of("role", "STUDENT", "active", true)).andExpect(status().isBadRequest());
        call(put("/api/admin/users/" + studentId), admin, Map.of("role", "STUDENT", "active", false)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", "budi@x.com", "password", "rahasia123"))))
            .andExpect(status().isUnauthorized());

        JsonNode cat = body(call(post("/api/admin/categories"), admin, Map.of("name", "Data Science")).andExpect(status().isCreated()));
        assertThat(cat.get("slug").asText()).isEqualTo("data-science");
        assertThat(body(mvc.perform(get("/api/public/categories")))).hasSize(1);
    }

    // ---------- helpers ----------

    private long createCourse(String title, int price) throws Exception {
        return body(call(post("/api/instructor/courses"), instructor, courseBody(title, price)).andExpect(status().isCreated()))
            .get("course").get("id").asLong();
    }

    private long publishedCourse(String title, int price) throws Exception {
        long id = createCourse(title, price);
        long section = body(call(post("/api/instructor/courses/" + id + "/sections"), instructor, Map.of("title", "Bab")))
            .get("sections").get(0).get("id").asLong();
        lesson(section, Map.of("title", "Materi", "type", "TEXT", "content", "Isi"));
        call(post("/api/instructor/courses/" + id + "/publish"), instructor, null).andExpect(status().isOk());
        return id;
    }

    private Map<String, Object> courseBody(String title, int price) {
        return Map.of("title", title, "subtitle", "Sub", "description", "Deskripsi " + title, "level", "BEGINNER", "price", price);
    }

    private JsonNode lesson(long sectionId, Map<String, Object> body) throws Exception {
        return body(call(post("/api/instructor/sections/" + sectionId + "/lessons"), instructor, body).andExpect(status().isOk()));
    }

    private String login(String email, String password) throws Exception {
        return body(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("email", email, "password", password))))
            .andExpect(status().isOk())).get("token").asText();
    }

    private String register(String name, String email, boolean asInstructor) throws Exception {
        return body(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("fullName", name, "email", email, "password", "rahasia123", "instructor", asInstructor))))
            .andExpect(status().isCreated())).get("token").asText();
    }

    private ResultActions call(MockHttpServletRequestBuilder req, String token, Object payload) throws Exception {
        req.header("Authorization", "Bearer " + token);
        if (payload != null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload));
        return mvc.perform(req);
    }

    private ResultActions upload(MockMultipartHttpServletRequestBuilder req, String token, MockMultipartFile file) throws Exception {
        return mvc.perform(req.file(file).header("Authorization", "Bearer " + token));
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
