package com.lms.service;

import com.lms.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Local-disk storage (a Docker volume in production). File types are detected from magic bytes,
 * never from the client's name or Content-Type, and stored files always get server-generated names.
 */
@Slf4j
@Service
public class FileStorageService {
    public enum Kind {
        IMAGE(2L * 1024 * 1024, Set.of("jpg", "png", "webp"), "Format gambar harus JPG, PNG, atau WebP"),
        PDF(20L * 1024 * 1024, Set.of("pdf"), "File harus berformat PDF"),
        ASSIGNMENT(10L * 1024 * 1024, Set.of("pdf", "zip", "jpg", "png", "webp"),
            "File tugas harus PDF, ZIP, DOCX/XLSX/PPTX, atau gambar");

        final long maxBytes;
        final Set<String> allowed;
        final String error;

        Kind(long maxBytes, Set<String> allowed, String error) {
            this.maxBytes = maxBytes;
            this.allowed = allowed;
            this.error = error;
        }
    }

    public record Stored(String name, String extension) {}

    private static final Pattern SAFE_NAME = Pattern.compile("[a-z]+-[a-f0-9]{32}\\.[a-z]{3,4}");
    private static final Map<String, MediaType> TYPES = Map.of(
        "jpg", MediaType.IMAGE_JPEG, "png", MediaType.IMAGE_PNG, "webp", MediaType.parseMediaType("image/webp"),
        "pdf", MediaType.APPLICATION_PDF, "zip", MediaType.parseMediaType("application/zip"),
        "docx", MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        "xlsx", MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        "pptx", MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"));

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public Stored store(String folder, String prefix, MultipartFile file, Kind kind) {
        if (file == null || file.isEmpty()) throw new BusinessException("File kosong atau tidak dikirim");
        if (file.getSize() > kind.maxBytes) throw new BusinessException("Ukuran file maksimal " + (kind.maxBytes / 1024 / 1024) + " MB");
        byte[] data;
        try (InputStream in = file.getInputStream()) {
            data = in.readNBytes((int) kind.maxBytes + 1);
        } catch (IOException e) {
            throw new BusinessException("Gagal membaca file");
        }
        if (data.length > kind.maxBytes) throw new BusinessException("Ukuran file maksimal " + (kind.maxBytes / 1024 / 1024) + " MB");

        String ext = detect(data);
        // ZIP container: keep the Office extension when the client says it is one, otherwise plain zip.
        if ("zip".equals(ext)) ext = officeExtension(file.getOriginalFilename());
        boolean allowed = ext != null && (kind.allowed.contains(ext)
            || (kind == Kind.ASSIGNMENT && Set.of("docx", "xlsx", "pptx").contains(ext)));
        if (!allowed) throw new BusinessException(kind.error);

        String name = prefix + "-" + UUID.randomUUID().toString().replace("-", "") + "." + ext;
        try {
            Path dir = folder(folder);
            Files.createDirectories(dir);
            Path tmp = Files.createTempFile(dir, "upload-", ".tmp");
            Files.write(tmp, data);
            Files.move(tmp, dir.resolve(name), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            log.error("Failed to store file", e);
            throw new BusinessException("Gagal menyimpan file di server");
        }
        return new Stored(name, ext);
    }

    /** Returns the path of a stored file, or null if the name is unsafe or the file is missing. */
    public Path resolve(String folder, String name) {
        if (name == null || !SAFE_NAME.matcher(name).matches()) return null;
        Path dir = folder(folder);
        Path path = dir.resolve(name).normalize();
        return path.startsWith(dir) && Files.isRegularFile(path) ? path : null;
    }

    public MediaType mediaType(String name) {
        String ext = name.substring(name.lastIndexOf('.') + 1);
        return TYPES.getOrDefault(ext, MediaType.APPLICATION_OCTET_STREAM);
    }

    public void delete(String folder, String name) {
        Path path = resolve(folder, name);
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Could not delete {}/{}", folder, name, e);
        }
    }

    private Path folder(String folder) {
        return root.resolve(folder).normalize();
    }

    static String detect(byte[] d) {
        if (d.length >= 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) return "jpg";
        if (d.length >= 8 && Arrays.equals(Arrays.copyOf(d, 8),
            new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})) return "png";
        if (d.length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F'
            && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') return "webp";
        if (d.length >= 5 && d[0] == '%' && d[1] == 'P' && d[2] == 'D' && d[3] == 'F' && d[4] == '-') return "pdf";
        if (d.length >= 4 && d[0] == 'P' && d[1] == 'K' && d[2] == 3 && d[3] == 4) return "zip";
        return null;
    }

    private static String officeExtension(String originalName) {
        if (originalName == null) return "zip";
        String lower = originalName.toLowerCase(Locale.ROOT);
        for (String ext : new String[]{"docx", "xlsx", "pptx"}) {
            if (lower.endsWith("." + ext)) return ext;
        }
        return "zip";
    }
}
