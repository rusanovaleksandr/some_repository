from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable

from deep_translator import GoogleTranslator
from langdetect import LangDetectException, detect


@dataclass
class TranslationStats:
    """Статистика перевода"""
    translated_fields_count: int = 0


def is_russian_text(text: str) -> bool:
    """Возвращает True для русского текста, чтобы пропустить избыточный перевод."""
    if not text or not text.strip():
        return True

    has_cyrillic = bool(re.search(r"[А-Яа-яЁё]", text))
    has_latin = bool(re.search(r"[A-Za-z]", text))
    if has_cyrillic and not has_latin:
        return True

    try:
        lang = detect(text)
        return lang == "ru"
    except LangDetectException:
        return False


@lru_cache(maxsize=1)
def _ru_translator() -> GoogleTranslator:
    """Легковесный онлайн-переводчик на русский язык."""
    return GoogleTranslator(source="auto", target="ru")


def _translate_single_text_to_ru(text: str, stats: TranslationStats) -> str:
    """Переводит отдельный текст на русский язык."""
    if not text or not text.strip():
        return text

    if is_russian_text(text):
        return text

    try:
        detected = detect(text)
        if detected == "ru":
            return text
    except LangDetectException:
        pass

    translator = _ru_translator()
    translated = translator.translate(text)
    if translated != text:
        stats.translated_fields_count += 1
    return translated


def _translate_list(values: Iterable[str], stats: TranslationStats) -> list[str]:
    """Переводит список строк на русский язык."""
    return [_translate_single_text_to_ru(value, stats) for value in values]


def translate_work_program_values(work_program) -> tuple[object, TranslationStats]:
    """
    Переводит только поля значений на русский язык.
    Ключи JSON и структура схемы остаются без изменений.
    """
    translated = work_program.model_copy(deep=True)
    stats = TranslationStats()

    translated.nameWorkProgram = _translate_single_text_to_ru(translated.nameWorkProgram, stats)
    translated.previousDisciplines = _translate_list(translated.previousDisciplines, stats)

    new_topics = {}
    for topic_name, topic_data in translated.topics.items():
        translated_topic_name = _translate_single_text_to_ru(topic_name, stats)
        topic_data.educationalUnits = _translate_list(topic_data.educationalUnits, stats)
        new_topics[translated_topic_name] = topic_data

    translated.topics = new_topics
    return translated, stats