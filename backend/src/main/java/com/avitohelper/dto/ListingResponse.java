package com.avitohelper.dto;

import com.avitohelper.domain.ListingStatus;
import java.time.Instant;
import java.util.List;

public record ListingResponse(
        Long id,
        String title,
        String description,
        Long priceKopecks,
        String currency,
        String category,
        ListingStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant publishedAt,
        Long coverPhotoId,
        List<PhotoResponse> photos
) {
}
