package com.avitohelper.service;

import com.avitohelper.config.AppProperties;
import com.avitohelper.dto.StructuredListing;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Разбивает надиктованный текст объявления на поля (title/description/category)
 * с помощью Gemini Flash (бесплатный API Google AI Studio).
 */
@Service
public class GeminiService {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public GeminiService(RestClient.Builder builder, AppProperties props, ObjectMapper objectMapper) {
        this.restClient = builder.build();
        this.apiKey = props.gemini().apiKey();
        this.model = props.gemini().model();
        this.objectMapper = objectMapper;
    }

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
            throw new IllegalStateException(extractErrorMessage(e), e);
        }

        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            throw new IllegalStateException("Gemini вернул пустой ответ");
        }

        String json = response.candidates().get(0).content().parts().get(0).text();
        json = json == null ? "" : json.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }

        try {
            return objectMapper.readValue(json, StructuredListing.class);
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось разобрать ответ Gemini: " + json, e);
        }
    }

    private String extractErrorMessage(RestClientResponseException e) {
        try {
            String body = e.getResponseBodyAsString();
            if (body != null) {
                JsonNode node = objectMapper.readTree(body);
                String msg = node.path("error").path("message").asText();
                if (msg != null && !msg.isBlank()) {
                    return "Gemini: " + msg;
                }
            }
        } catch (Exception ignore) {
            // ignore
        }
        return "Gemini вернул ошибку (HTTP " + e.getStatusCode().value() + ")";
    }

    private Map<String, Object> buildBody(String text) {
        String prompt = "Ты — помощник для создания объявления о продаже на Avito. "
                + "Пользователь надиктовал текст голосом. Разложи его на поля и верни СТРОГО JSON "
                + "с ключами title, description, category: "
                + "title — короткое название товара (до 8 слов), "
                + "description — описание (состояние, комплектация и т.п.) без цены, "
                + "category — категория товара, если понятна из текста, иначе null. "
                + "Не выдумывай ничего сверх сказанного, не добавляй цену в title/description. "
                + "Текст объявления:\n" + text;

        return Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
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
