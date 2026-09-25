package com.avitohelper.dto;

import com.avitohelper.domain.ListingStatus;
import java.time.Instant;

public record ListingSummaryResponse(
        Long id,
        String title,
        Long priceKopecks,
        String currency,
        String category,
        ListingStatus status,
        Instant updatedAt,
        Long coverPhotoId,
        int photoCount
) {
}
