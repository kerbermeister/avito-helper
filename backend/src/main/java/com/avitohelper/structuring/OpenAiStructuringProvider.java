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
@Order(2)
public class OpenAiStructuringProvider implements StructuringProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiStructuringProvider.class);

    private static final String URL = "https://api.openai.com/v1/chat/completions";

    private final RestClient restClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public OpenAiStructuringProvider(RestClient.Builder builder, AppProperties props, ObjectMapper objectMapper) {
        this.restClient = builder.build();
        this.enabled = props.openAi().enabled();
        this.apiKey = props.openAi().apiKey();
        this.model = props.openAi().model();
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "openai";
    }

    @Override
    public boolean enabled() {
        return enabled;
    }

    @Override
    public StructuredListing structure(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Не задан OpenAI API key (OPENAI_API_KEY)");
        }

        ChatResponse response;
        try {
            response = restClient.post()
                    .uri(URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(buildBody(text))
                    .retrieve()
                    .body(ChatResponse.class);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(StructuringErrors.from(objectMapper, e, name()), e);
        }

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw new IllegalStateException("openai вернул пустой ответ");
        }

        return parseJson(response.choices().get(0).message().content());
    }

    private StructuredListing parseJson(String json) {
        String cleaned = json == null ? "" : json.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }
        log.info("openai вернул JSON: {}", cleaned);
        try {
            return objectMapper.readValue(cleaned, StructuredListing.class);
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось разобрать ответ openai: " + cleaned, e);
        }
    }

    private Map<String, Object> buildBody(String text) {
        return Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", StructuringPrompt.build(text))),
                "response_format", Map.of("type", "json_object")
        );
    }

    private record ChatResponse(List<Choice> choices) {
    }

    private record Choice(Message message) {
    }

    private record Message(String content) {
    }
}
