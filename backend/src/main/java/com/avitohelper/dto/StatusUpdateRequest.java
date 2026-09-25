package com.avitohelper.dto;

import com.avitohelper.domain.ListingStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(@NotNull ListingStatus status) {
}
