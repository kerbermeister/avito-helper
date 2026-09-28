package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Фасад структуризации. Не знает про конкретные интеграции —
 * делегирует стратегии (которая уже выбирает провайдера).
 */
@Service
public class ListingStructuringService {

    private static final Logger log = LoggerFactory.getLogger(ListingStructuringService.class);

    private final StructuringStrategy strategy;

    public ListingStructuringService(StructuringStrategy strategy) {
        this.strategy = strategy;
    }

    public StructuredListing structure(String text, StructuringProgressListener listener) {
        if (text == null || text.isBlank()) {
            log.info("Пустой текст распознавания — структуризацию пропускаю, чтобы LLM ничего не выдумывал");
            return new StructuredListing(null, null, null, null);
        }
        log.info("Текст для структуризации (распознан голосом): {}", text);
        StructuredListing result = strategy.structure(text, listener);
        log.info("Результат структуризации LLM: title={}, description={}, category={}, price={}",
                result.title(), result.description(), result.category(), result.price());
        return result;
    }

    public StructuredListing structure(String text) {
        return structure(text, StructuringProgressListener.NOOP);
    }
}
