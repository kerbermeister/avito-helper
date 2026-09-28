package com.avitohelper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateListingRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 10000) String description,
        @NotNull @Positive Long priceKopecks,
        @Size(max = 255) String category
) {
}
