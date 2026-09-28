package com.avitohelper.rest;

import com.avitohelper.dto.TranscriptionResponse;
import com.avitohelper.transcription.TranscriptionProgressListener;
import com.avitohelper.transcription.TranscriptionService;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/transcribe")
public class TranscriptionController {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionController.class);

    /** Распознавание может быть небыстрым — даём стриму запас времени. */
    private static final long STREAM_TIMEOUT_MS = 180_000L;

    private final TranscriptionService transcriptionService;
    private final TaskExecutor taskExecutor;

    public TranscriptionController(TranscriptionService transcriptionService, TaskExecutor taskExecutor) {
        this.transcriptionService = transcriptionService;
        this.taskExecutor = taskExecutor;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TranscriptionResponse transcribe(@RequestParam("file") MultipartFile file) throws IOException {
        String text = transcriptionService.transcribe(file.getBytes(), file.getOriginalFilename());
        return new TranscriptionResponse(text);
    }

    /**
     * Стримит прогресс распознавания (SSE): каким провайдером пробуем, кто упал и
     * почему, кто сработал. В конце отдаёт событие {@code result} с текстом.
     */
    @PostMapping(value = "/stream",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> transcribeStream(@RequestParam("file") MultipartFile file) throws IOException {
        byte[] audio = file.getBytes();
        String filename = file.getOriginalFilename();
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        taskExecutor.execute(() -> {
            try {
                String text = transcriptionService.transcribe(audio, filename, new SseProgressListener(emitter));
                send(emitter, "result", Map.of("text", text));
                emitter.complete();
            } catch (RuntimeException e) {
                String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                send(emitter, "error", Map.of("message", message));
                emitter.complete();
            }
        });
        // X-Accel-Buffering: no просит nginx не буферизовать ответ (иначе SSE копится до конца).
        return ResponseEntity.ok()
                .header("X-Accel-Buffering", "no")
                .body(emitter);
    }

    private static void send(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (IOException | IllegalStateException e) {
            log.debug("Не удалось отправить событие «{}»: {}", event, e.getMessage());
        }
    }

    /** Превращает прогресс распознавания в SSE-события для фронта. */
    private static final class SseProgressListener implements TranscriptionProgressListener {

        private final SseEmitter emitter;

        private SseProgressListener(SseEmitter emitter) {
            this.emitter = emitter;
        }

        @Override
        public void onAttempt(String providerName) {
            send(emitter, "attempt", Map.of("provider", providerName));
        }

        @Override
        public void onFailure(String providerName, String reason) {
            send(emitter, "failure", Map.of("provider", providerName, "reason", reason));
        }

        @Override
        public void onSuccess(String providerName) {
            send(emitter, "success", Map.of("provider", providerName));
        }
    }
}
