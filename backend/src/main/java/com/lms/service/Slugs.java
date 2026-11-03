package com.lms.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

public final class Slugs {
    private Slugs() {}

    public static String of(String text) {
        String base = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "");
        if (base.length() > 80) base = base.substring(0, 80).replaceAll("-+$", "");
        return base.isEmpty() ? "kursus" : base;
    }

    /** Appends -2, -3, ... until {@code taken} returns false. */
    public static String unique(String text, Predicate<String> taken) {
        String base = of(text);
        String candidate = base;
        for (int i = 2; taken.test(candidate); i++) candidate = base + "-" + i;
        return candidate;
    }
}
