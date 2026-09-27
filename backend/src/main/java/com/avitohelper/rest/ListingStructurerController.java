package com.avitohelper.rest;

import com.avitohelper.dto.StructureRequest;
import com.avitohelper.dto.StructuredListing;
import com.avitohelper.structuring.ListingStructuringService;
import com.avitohelper.structuring.StructuringProgressListener;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/listings/structure")
public class ListingStructurerController {

    private static final Logger log = LoggerFactory.getLogger(ListingStructurerController.class);

    /** LLM отвечает небыстро — даём стриму запас времени. */
    private static final long STREAM_TIMEOUT_MS = 180_000L;

    private final ListingStructuringService structuringService;
    private final TaskExecutor taskExecutor;

    public ListingStructurerController(ListingStructuringService structuringService, TaskExecutor taskExecutor) {
        this.structuringService = structuringService;
        this.taskExecutor = taskExecutor;
    }

    @PostMapping
    public StructuredListing structure(@RequestBody StructureRequest request) {
        return structuringService.structure(request.text());
    }

    /**
     * Стримит прогресс структуризации (SSE): какие провайдеры пробуются,
     * кто упал и почему, кто сработал. В конце отдаёт событие {@code result}.
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> structureStream(@RequestBody StructureRequest request) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        taskExecutor.execute(() -> {
            try {
                StructuredListing result =
                        structuringService.structure(request.text(), new SseProgressListener(emitter));
                send(emitter, "result", result);
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

    /** Превращает прогресс структуризации в SSE-события для фронта. */
    private static final class SseProgressListener implements StructuringProgressListener {

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
