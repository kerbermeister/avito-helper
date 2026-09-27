package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;

/**
 * Стратегия структуризации надиктованного текста.
 * Не знает про конкретные интеграции — работает через список провайдеров.
 */
public interface StructuringStrategy {

    /**
     * Структурирует текст и по ходу дела сообщает слушателю о прогрессе
     * (какой провайдер пробуется, кто упал и почему, кто сработал).
     */
    StructuredListing structure(String text, StructuringProgressListener listener);

    /** Структуризация без отчёта о прогрессе. */
    default StructuredListing structure(String text) {
        return structure(text, StructuringProgressListener.NOOP);
    }
}
