package com.avitohelper.transcription;

import com.avitohelper.config.AppProperties;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Распознавание речи через OpenAI (модель gpt-4o-mini-transcribe).
 */
@Component
@Order(2)
public class OpenAiTranscriptionProvider implements TranscriptionProvider {

    private static final String URL = "https://api.openai.com/v1/audio/transcriptions";

    private final RestClient restClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;

    public OpenAiTranscriptionProvider(RestClient.Builder builder, AppProperties props) {
        this.restClient = builder.build();
        this.enabled = props.stt().openai().enabled();
        this.apiKey = props.stt().openai().apiKey();
        this.model = props.stt().openai().model();
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
    public String transcribe(byte[] audio, String filename) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Не задан OpenAI API key (OPENAI_API_KEY)");
        }

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("file", new ByteArrayResource(audio) {
            @Override
            public String getFilename() {
                return filename != null ? filename : "audio";
            }
        }, MediaType.APPLICATION_OCTET_STREAM);
        bodyBuilder.part("model", model);
        // Язык подсказываем, чтобы не тратить время на автоопределение
        bodyBuilder.part("language", "ru");

        try {
            OpenAiTranscriptionResponse response = restClient.post()
                    .uri(URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(bodyBuilder.build())
                    .retrieve()
                    .body(OpenAiTranscriptionResponse.class);

            return response != null && response.text() != null ? response.text() : "";
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(
                    "openai stt: HTTP " + e.getStatusCode().value() + " " + e.getResponseBodyAsString(), e);
        }
    }

    private record OpenAiTranscriptionResponse(String text) {
    }
}
