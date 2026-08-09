package com.makemycrip.common.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Register Java 8 date/time module so LocalDate, LocalDateTime etc.
        // are serialized as ISO strings ("yyyy-MM-dd") instead of arrays.
        mapper.registerModule(new JavaTimeModule());
        // Disable writing dates as timestamps (arrays like [2026,5,3])
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        // Do not fail when the JSON payload contains fields not present in the DTO.
        // This prevents "Malformed JSON request" errors when the frontend sends
        // extra fields (e.g. hotelId) that the backend DTO does not declare.
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return mapper;
    }
}
