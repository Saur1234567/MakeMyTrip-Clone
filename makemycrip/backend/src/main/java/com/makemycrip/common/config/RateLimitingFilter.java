package com.makemycrip.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemycrip.common.response.ApiResponse;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    // key: "type:ip" -> bucket
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String ip = getClientIp(request);

        Bucket bucket = resolveBucket(path, ip);
        if (bucket != null && !bucket.tryConsume(1)) {
            log.warn("Rate limit exceeded: ip={} path={}", ip, path);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiResponse<Void> body = ApiResponse.error("Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED");
            response.getWriter().write(objectMapper.writeValueAsString(body));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Bucket resolveBucket(String path, String ip) {
        if (path.contains("/auth/login")) {
            // 5 requests per 15 minutes
            return buckets.computeIfAbsent("login:" + ip,
                    k -> Bucket.builder()
                            .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(15))))
                            .build());
        }
        if (path.contains("/auth/otp") || path.contains("/auth/verify") || path.contains("/auth/forgot-password")) {
            // 3 requests per 10 minutes
            return buckets.computeIfAbsent("otp:" + ip,
                    k -> Bucket.builder()
                            .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofMinutes(10))))
                            .build());
        }
        if (path.contains("/hotels/search") || path.contains("/hotels?")) {
            // 100 requests per minute
            return buckets.computeIfAbsent("search:" + ip,
                    k -> Bucket.builder()
                            .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
                            .build());
        }
        if (path.contains("/bookings") && "POST".equalsIgnoreCase("")) {
            // 10 booking requests per minute
            return buckets.computeIfAbsent("booking:" + ip,
                    k -> Bucket.builder()
                            .addLimit(Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1))))
                            .build());
        }
        return null;
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
