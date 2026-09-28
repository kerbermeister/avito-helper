package com.avitohelper.transcription;

/**
 * Единый интерфейс распознавания речи (локальный faster-whisper, OpenAI и т.д.).
 * Бросает исключение при ошибке — это сигнал сервису попробовать следующего провайдера.
 */
public interface TranscriptionProvider {

    /** Распознаёт речь из аудио. filename нужен, чтобы провайдер понял формат. */
    String transcribe(byte[] audio, String filename);

    String name();

    /**
     * Включён ли провайдер. Управляется настройками
     * {@code app.stt.local.enabled} / {@code app.stt.openai.enabled}.
     */
    default boolean enabled() {
        return true;
    }
}
