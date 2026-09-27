package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;

/**
 * Стратегия структуризации надиктованного текста.
 * Не знает про конкретные интеграции — работает через список провайдеров.
 */
public interface StructuringStrategy {

    StructuredListing structure(String text);
}
