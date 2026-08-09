package com.makemycrip.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class SlugUtil {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern MULTI_DASH = Pattern.compile("-{2,}");

    private SlugUtil() {}

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) return "";
        String normalized = Normalizer.normalize(input.trim().toLowerCase(Locale.ENGLISH), Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(WHITESPACE.matcher(normalized).replaceAll("-")).replaceAll("");
        return MULTI_DASH.matcher(slug).replaceAll("-").replaceAll("^-|-$", "");
    }

    public static String toUniqueSlug(String input, String suffix) {
        return toSlug(input) + "-" + suffix;
    }
}
