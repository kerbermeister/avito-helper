package com.avitohelper.structuring;

import com.avitohelper.config.AppProperties;
import com.avitohelper.dto.StructuredListing;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

@Component
@Order(1)
public class GeminiStructuringProvider implements StructuringProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiStructuringProvider.class);

    private final RestClient restClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public GeminiStructuringProvider(RestClient.Builder builder, AppProperties props, ObjectMapper objectMapper) {
        this.restClient = builder.build();
        this.enabled = props.gemini().enabled();
        this.apiKey = props.gemini().apiKey();
        this.model = props.gemini().model();
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "gemini";
    }

    @Override
    public boolean enabled() {
        return enabled;
    }

    @Override
    public StructuredListing structure(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Не задан Gemini API key (GEMINI_API_KEY)");
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        GeminiResponse response;
        try {
            response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(buildBody(text))
                    .retrieve()
                    .body(GeminiResponse.class);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(StructuringErrors.from(objectMapper, e, name()), e);
        }

        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            throw new IllegalStateException("gemini вернул пустой ответ");
        }

        return parseJson(response.candidates().get(0).content().parts().get(0).text());
    }

    private StructuredListing parseJson(String json) {
        String cleaned = json == null ? "" : json.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }
        log.info("gemini вернул JSON: {}", cleaned);
        try {
            return objectMapper.readValue(cleaned, StructuredListing.class);
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось разобрать ответ gemini: " + cleaned, e);
        }
    }

    private Map<String, Object> buildBody(String text) {
        return Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", StructuringPrompt.build(text))))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.2
                )
        );
    }

    private record GeminiResponse(List<Candidate> candidates) {
    }

    private record Candidate(Content content) {
    }

    private record Content(List<Part> parts) {
    }

    private record Part(String text) {
    }
}
