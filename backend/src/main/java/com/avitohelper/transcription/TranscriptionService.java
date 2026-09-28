package com.avitohelper.transcription;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Фасад распознавания речи. Проходит по провайдерам по очереди (в порядке @Order):
 * отключённые пропускает, при падении пробует следующий. Если упали все — бросает
 * ошибку последнего.
 */
@Service
public class TranscriptionService {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionService.class);

    private final List<TranscriptionProvider> providers;

    public TranscriptionService(List<TranscriptionProvider> providers) {
        this.providers = providers;
    }

    public String transcribe(byte[] audio, String filename) {
        return transcribe(audio, filename, TranscriptionProgressListener.NOOP);
    }

    public String transcribe(byte[] audio, String filename, TranscriptionProgressListener listener) {
        RuntimeException lastError = null;
        for (TranscriptionProvider provider : providers) {
            if (!provider.enabled()) {
                log.info("Провайдер распознавания «{}» отключён — пропускаю", provider.name());
                continue;
            }
            listener.onAttempt(provider.name());
            try {
                String text = provider.transcribe(audio, filename);
                log.info("Распознавание речи через «{}»: {}", provider.name(), text);
                listener.onSuccess(provider.name());
                return text;
            } catch (RuntimeException e) {
                lastError = e;
                String reason = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                log.warn("Провайдер распознавания «{}» не сработал: {}", provider.name(), reason);
                listener.onFailure(provider.name(), reason);
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        throw new IllegalStateException("Нет включённых провайдеров распознавания речи");
    }
}
