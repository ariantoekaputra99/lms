package com.lms.service;

import com.lms.entity.Certificate;
import com.lms.exception.NotFoundException;
import com.lms.repository.CertificateRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.text.Normalizer;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Renders a landscape A4 certificate with PDFBox's built-in fonts (no font files needed). */
@Service
public class CertificatePdfService {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.forLanguageTag("id-ID"));
    private static final Color INK = new Color(0x1E, 0x1B, 0x4B);
    private static final Color ACCENT = new Color(0x4F, 0x46, 0xE5);
    private static final Color MUTED = new Color(0x64, 0x74, 0x8B);

    private final CertificateRepository certificates;
    private final String appUrl;
    private final String platformName;
    private final ZoneId zone;

    public CertificatePdfService(CertificateRepository certificates,
                                 @Value("${app.frontend-url}") String appUrl,
                                 @Value("${app.platform-name:Akademi LMS}") String platformName,
                                 @Value("${app.timezone:Asia/Jakarta}") String zone) {
        this.certificates = certificates;
        this.appUrl = appUrl.replaceAll("/+$", "");
        this.platformName = platformName;
        this.zone = ZoneId.of(zone);
    }

    @Transactional(readOnly = true)
    public byte[] render(String code) {
        Certificate c = certificates.findByCode(code.trim().toUpperCase(Locale.ROOT))
            .orElseThrow(() -> new NotFoundException("Sertifikat tidak ditemukan"));
        PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        PDType1Font italic = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD_ITALIC);

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDRectangle size = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage page = new PDPage(size);
            doc.addPage(page);
            float w = size.getWidth();
            float h = size.getHeight();
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setStrokingColor(ACCENT);
                cs.setLineWidth(6);
                cs.addRect(24, 24, w - 48, h - 48);
                cs.stroke();
                cs.setLineWidth(1);
                cs.addRect(36, 36, w - 72, h - 72);
                cs.stroke();

                centered(cs, bold, 14, ACCENT, platformName.toUpperCase(Locale.ROOT), w, h - 90);
                centered(cs, bold, 40, INK, "SERTIFIKAT", w, h - 150);
                centered(cs, regular, 14, MUTED, "Penyelesaian Kursus", w, h - 175);
                centered(cs, regular, 14, MUTED, "Diberikan kepada", w, h - 230);
                centered(cs, italic, fit(italic, c.getStudentName(), 36, w - 160), INK, c.getStudentName(), w, h - 280);
                cs.setStrokingColor(MUTED);
                cs.moveTo(w / 2 - 200, h - 295);
                cs.lineTo(w / 2 + 200, h - 295);
                cs.stroke();
                centered(cs, regular, 14, MUTED, "atas keberhasilannya menyelesaikan kursus", w, h - 330);
                centered(cs, bold, fit(bold, c.getCourseTitle(), 22, w - 160), INK, c.getCourseTitle(), w, h - 365);

                String date = DATE.format(c.getIssuedAt().atZoneSameInstant(zone));
                text(cs, regular, 11, MUTED, "Tanggal terbit", 90, 120);
                text(cs, bold, 13, INK, date, 90, 102);
                float right = w - 90;
                text(cs, regular, 11, MUTED, "Instruktur", right - width(regular, "Instruktur", 11), 120);
                text(cs, bold, 13, INK, c.getInstructorName(), right - width(bold, safe(c.getInstructorName()), 13), 102);

                String verify = "Verifikasi: " + appUrl + "/verify/" + c.getCode();
                centered(cs, regular, 10, MUTED, "No. sertifikat " + c.getCode(), w, 72);
                centered(cs, regular, 10, MUTED, verify, w, 58);
            }
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void centered(PDPageContentStream cs, PDType1Font font, float size, Color color, String text,
                                 float pageWidth, float y) throws IOException {
        String s = safe(text);
        text(cs, font, size, color, s, (pageWidth - width(font, s, size)) / 2, y);
    }

    private static void text(PDPageContentStream cs, PDType1Font font, float size, Color color, String text,
                             float x, float y) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.setNonStrokingColor(color);
        cs.newLineAtOffset(x, y);
        cs.showText(safe(text));
        cs.endText();
    }

    private static float width(PDType1Font font, String text, float size) throws IOException {
        return font.getStringWidth(safe(text)) / 1000 * size;
    }

    /** Shrinks the font so long names/titles still fit on one line. */
    private static float fit(PDType1Font font, String text, float max, float available) throws IOException {
        float size = max;
        while (size > 12 && width(font, text, size) > available) size -= 1;
        return size;
    }

    /** Standard-14 fonts only cover WinAnsi; strip accents and replace anything else. */
    static String safe(String text) {
        if (text == null) return "";
        String s = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        StringBuilder sb = new StringBuilder(s.length());
        for (char ch : s.toCharArray()) sb.append(ch >= 32 && ch < 127 ? ch : '?');
        return sb.toString();
    }
}
