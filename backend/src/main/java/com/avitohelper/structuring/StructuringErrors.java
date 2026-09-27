package com.avitohelper.structuring;

import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Извлекает понятное сообщение об ошибке из ответа LLM-провайдера.
 */
public final class StructuringErrors {

    private StructuringErrors() {
    }

    public static String from(ObjectMapper mapper, RestClientResponseException e, String providerName) {
        try {
            String body = e.getResponseBodyAsString();
            if (body != null) {
                JsonNode node = mapper.readTree(body);
                String msg = node.path("error").path("message").asText();
                if (msg != null && !msg.isBlank()) {
                    return providerName + ": " + msg;
                }
            }
        } catch (Exception ignore) {
            // ignore
        }
        return providerName + " вернул ошибку (HTTP " + e.getStatusCode().value() + ")";
    }
}
