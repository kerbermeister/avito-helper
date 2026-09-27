package com.avitohelper.structuring;

/**
 * Строит промпт для структуризации объявления. Общий для всех провайдеров.
 */
public final class StructuringPrompt {

    private StructuringPrompt() {
    }

    public static String build(String text) {
        return "Ты — помощник для создания объявления о продаже на Avito. "
                + "Пользователь надиктовал текст голосом. Разложи его на поля и верни СТРОГО JSON "
                + "с ключами title, description, category: "
                + "title — короткое название товара (до 8 слов), "
                + "description — описание (состояние, комплектация и т.п.) без цены, "
                + "category — категория товара, если понятна из текста, иначе null. "
                + "Не выдумывай ничего сверх сказанного, не добавляй цену в title/description. "
                + "Текст объявления:\n" + text;
    }
}
