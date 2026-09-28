package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Проходит по провайдерам по очереди (в порядке @Order): если текущий упал —
 * пробует следующий. Если упали все — бросает ошибку последнего.
 *
 * <p>Каждая попытка, причина падения и итоговый успех отдаются в
 * {@link StructuringProgressListener}, чтобы UI мог показать процесс.
 */
@Component
public class FallbackStructuringStrategy implements StructuringStrategy {

    private static final Logger log = LoggerFactory.getLogger(FallbackStructuringStrategy.class);

    private final List<StructuringProvider> providers;

    public FallbackStructuringStrategy(List<StructuringProvider> providers) {
        this.providers = providers;
    }

    @Override
    public StructuredListing structure(String text, StructuringProgressListener listener) {
        RuntimeException lastError = null;
        for (StructuringProvider provider : providers) {
            if (!provider.enabled()) {
                log.info("Провайдер «{}» отключён — пропускаю", provider.name());
                continue;
            }
            listener.onAttempt(provider.name());
            try {
                StructuredListing result = provider.structure(text);
                listener.onSuccess(provider.name());
                return result;
            } catch (RuntimeException e) {
                lastError = e;
                String reason = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                log.warn("Провайдер «{}» не сработал: {}", provider.name(), reason);
                listener.onFailure(provider.name(), reason);
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        throw new IllegalStateException("Нет включённых провайдеров структуризации");
    }
}
