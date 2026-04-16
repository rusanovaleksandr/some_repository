from abc import ABC, abstractmethod
from typing import Any


class BaseParser(ABC):
    """
    Абстрактный класс для парсера образовательных программ
    """
    @abstractmethod
    def parse(self, files: list[tuple[str, bytes]], educational_program_name: str) -> dict[str, list[dict[str, Any]]]:
        """
        Парсит набор PDF-файлов и возвращает структурированные данные.
        
        Аргументы:
            files: Список кортежей (file_name, file_in_bytes). Каждый файл — рабочая программа одной дисциплины.
            educational_program_name: Название образовательной программы, становится ключом верхнего уровня в возвращаемом dict.
        
        Возвращаемое значение:
            dict с ключом educational_program_name и значением — списком дисциплин.
        """
        pass