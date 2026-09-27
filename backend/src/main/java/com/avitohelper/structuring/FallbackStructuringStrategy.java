package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Проходит по провайдерам по очереди (в порядке @Order): если текущий упал —
 * пробует следующий. Если упали все — бросает ошибку последнего.
 */
@Component
public class FallbackStructuringStrategy implements StructuringStrategy {

    private static final Logger log = LoggerFactory.getLogger(FallbackStructuringStrategy.class);

    private final List<StructuringProvider> providers;

    public FallbackStructuringStrategy(List<StructuringProvider> providers) {
        this.providers = providers;
    }

    @Override
    public StructuredListing structure(String text) {
        RuntimeException lastError = null;
        for (StructuringProvider provider : providers) {
            try {
                return provider.structure(text);
            } catch (RuntimeException e) {
                lastError = e;
                log.warn("Провайдер «{}» не сработал: {}", provider.name(), e.getMessage());
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        throw new IllegalStateException("Нет доступных провайдеров структуризации");
    }
}
