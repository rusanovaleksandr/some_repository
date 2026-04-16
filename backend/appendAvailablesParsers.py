from src.dataBase.dependencies import get_db

def appendParsers():
    db = get_db()
    db.openConnection()
    # Хардкод неприятный, может есть смысл добавить метод в интерфейс парсера getUniversityName -> str.
    # Тогда всю будет соответствовать указанной мапе.
    db.addParser("ГУАП", 0)
    db.addParser("СПБГЭТУ ЛЭТИ", 1)
    db.addParser("МПУ", 2)
    db.addParser("МТУСИ", 3)
    db.addParser("СПБПУ", 4)
    db.closeConnection()

if __name__ == "__main__":
    appendParsers()