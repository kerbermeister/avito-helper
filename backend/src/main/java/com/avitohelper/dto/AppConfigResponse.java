package com.avitohelper.dto;

public record AppConfigResponse(
        int maxRecordingSeconds,
        double minSpeechLevel,
        boolean fieldDictationEnabled,
        int imageMaxDimension,
        float imageQuality
) {
}
