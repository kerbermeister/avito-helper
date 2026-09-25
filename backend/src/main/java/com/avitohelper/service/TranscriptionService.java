package com.avitohelper.service;

import com.avitohelper.config.AppProperties;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Клиент к сервису распознавания речи (faster-whisper).
 */
@Service
public class TranscriptionService {

    private final RestClient restClient;

    public TranscriptionService(RestClient.Builder builder, AppProperties props) {
        this.restClient = builder.baseUrl(props.stt().url()).build();
    }

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
