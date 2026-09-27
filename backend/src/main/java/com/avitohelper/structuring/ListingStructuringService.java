package com.avitohelper.structuring;

import com.avitohelper.dto.StructuredListing;
import org.springframework.stereotype.Service;

/**
 * Фасад структуризации. Не знает про конкретные интеграции —
 * делегирует стратегии (которая уже выбирает провайдера).
 */
@Service
public class ListingStructuringService {

    private final StructuringStrategy strategy;

    public ListingStructuringService(StructuringStrategy strategy) {
        this.strategy = strategy;
    }

    public StructuredListing structure(String text) {
        return strategy.structure(text);
    }
}
