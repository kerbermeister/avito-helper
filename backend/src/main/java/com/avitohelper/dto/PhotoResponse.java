package com.avitohelper.dto;

import java.time.Instant;

public record PhotoResponse(
        Long id,
        String fileName,
        String mimeType,
        Long sizeBytes,
        Integer sortOrder,
        Instant createdAt,
        String url,
        String thumbUrl
) {
}
