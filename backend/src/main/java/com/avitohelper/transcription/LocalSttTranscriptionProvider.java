package com.avitohelper.transcription;

import com.avitohelper.config.AppProperties;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Локальное распознавание речи — контейнер faster-whisper (STT_URL).
 */
@Component
@Order(1)
public class LocalSttTranscriptionProvider implements TranscriptionProvider {

    private final RestClient restClient;
    private final boolean enabled;

    public LocalSttTranscriptionProvider(RestClient.Builder builder, AppProperties props) {
        this.restClient = builder.baseUrl(props.stt().local().url()).build();
        this.enabled = props.stt().local().enabled();
    }

    @Override
    public String name() {
        return "local";
    }

    @Override
    public boolean enabled() {
        return enabled;
    }

    @Override
    public String transcribe(byte[] audio, String filename) {
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("file", new ByteArrayResource(audio) {
            @Override
            public String getFilename() {
                return filename != null ? filename : "audio";
            }
        }, MediaType.APPLICATION_OCTET_STREAM);

        MultiValueMap<String, HttpEntity<?>> parts = bodyBuilder.build();

        SttResponse response = restClient.post()
                .uri("/transcribe")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts)
                .retrieve()
                .body(SttResponse.class);

        return response != null ? response.text() : "";
    }

    private record SttResponse(String text) {
    }
}
