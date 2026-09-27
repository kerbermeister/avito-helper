package com.avitohelper.structuring;

/**
 * Слушатель прогресса структуризации. Стратегия сообщает, к какому провайдеру
 * обращается, какой провайдер упал и почему, и какой в итоге сработал.
 * Нужен, чтобы фронт мог показать процесс в реальном времени.
 */
public interface StructuringProgressListener {

    /** Заглушка: ничего не делает (используется, когда прогресс не нужен). */
    StructuringProgressListener NOOP = new StructuringProgressListener() {
    };

    /** Стратегия пробует провайдера с таким именем. */
    default void onAttempt(String providerName) {
    }

    /** Провайдер не сработал: reason — понятная человеку причина. */
    default void onFailure(String providerName, String reason) {
    }

    /** Провайдер успешно структурировал ответ. */
    default void onSuccess(String providerName) {
    }
}
