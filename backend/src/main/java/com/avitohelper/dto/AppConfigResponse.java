package com.avitohelper.dto;

public record AppConfigResponse(
        int maxRecordingSeconds,
        double minSpeechLevel,
        boolean fieldDictationEnabled
) {
}
