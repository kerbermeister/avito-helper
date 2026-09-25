package com.avitohelper.dto;

import com.avitohelper.domain.ListingStatus;
import java.time.Instant;
import java.util.List;

public record ListingSummaryResponse(
        Long id,
        String title,
        Long priceKopecks,
        String currency,
        String category,
        ListingStatus status,
        Instant createdAt,
        Instant updatedAt,
        Long coverPhotoId,
        int photoCount,
        List<Long> photoIds
) {
}
