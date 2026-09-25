package com.avitohelper.dto;

public record ListingParseResponse(
        String rawText,
        String title,
        String description,
        String category
) {
}
