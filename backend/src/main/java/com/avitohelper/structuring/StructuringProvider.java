package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;

/**
 * Единый интерфейс интеграции с LLM-провайдером (Gemini, OpenAI и т.д.).
 * Бросает исключение при ошибке — это сигнал стратегии перейти к следующему провайдеру.
 */
public interface StructuringProvider {

    StructuredListing structure(String text);

    String name();
}
