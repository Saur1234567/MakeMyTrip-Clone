package com.makemycrip.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeoLocationService {

    private final WebClient.Builder webClientBuilder;

    @SuppressWarnings("unchecked")
    public Map<String, String> getLocation(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()
                || ipAddress.equals("127.0.0.1") || ipAddress.startsWith("192.168.")
                || ipAddress.startsWith("10.") || ipAddress.equals("0:0:0:0:0:0:0:1")) {
            return Map.of("city", "Local", "country", "Local");
        }
        try {
            Map<String, Object> response = webClientBuilder.build()
                    .get()
                    .uri("https://ipapi.co/" + ipAddress + "/json/")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            if (response != null) {
                String city = String.valueOf(response.getOrDefault("city", "Unknown"));
                String country = String.valueOf(response.getOrDefault("country_name", "Unknown"));
                return Map.of("city", city, "country", country);
            }
        } catch (Exception e) {
            log.warn("Could not resolve geolocation for IP {}: {}", ipAddress, e.getMessage());
        }
        return Map.of("city", "Unknown", "country", "Unknown");
    }
}
