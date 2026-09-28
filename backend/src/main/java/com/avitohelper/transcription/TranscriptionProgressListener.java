package com.avitohelper.transcription;

/**
 * Слушатель прогресса распознавания речи. Сервис сообщает, каким провайдером
 * пытается распознать, какой упал и почему, и какой в итоге сработал.
 * Нужен, чтобы фронт мог показать процесс в реальном времени.
 */
public interface TranscriptionProgressListener {

    /** Заглушка: ничего не делает. */
    TranscriptionProgressListener NOOP = new TranscriptionProgressListener() {
    };

    /** Сервис пробует провайдера с таким именем. */
    default void onAttempt(String providerName) {
    }

    /** Провайдер не сработал: reason — понятная человеку причина. */
    default void onFailure(String providerName, String reason) {
    }

    /** Провайдер успешно распознал речь. */
    default void onSuccess(String providerName) {
    }
}
