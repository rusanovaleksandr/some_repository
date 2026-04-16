import psycopg2.pool
import hashlib

class DataBaseController:
    """Контроллер базы данных по хранению пользователей и файлов университетов"""

    WORK_PROGRAM_PATH_INDEX = 3
    WORK_PROGRAM_FOLDER_INDEX = 2

    def __init__(self, dbName: str, host: str, port: str, user: str, password: str,
                 minConnNumber: int, maxConnNumber: int):
        self.__dbName = dbName
        self.__host = host
        self.__port = port
        self.__user = user
        self.__password = password
        self.__minConnNumber = minConnNumber
        self.__maxConnNumber = maxConnNumber
        self.__poolConnections = None

        self.__tableUsers = "users"
        self.__tableUsersFields = ["login", "password_hash"]

        self.__tableUserFolder = "user_folders"
        self.__tableUserFolderFields = ["idUser", "folder_name"]

        self.__tableWorkPrograms = "uploaded_files"
        self.__tableWorkProgramsFields = ["idUser", "folder_name", "file_path"]

        self.__tableParsers = "ParserType"
        self.__tableParsersFields = ["universityName", "parserType"]

    def openConnection(self) -> bool:
        """Метод создания пулла соединений"""
        if not self.__dbName:
            return False
        try:
            self.__poolConnections = (
                psycopg2.pool.SimpleConnectionPool(self.__minConnNumber, self.__maxConnNumber,
                                                   database=self.__dbName, host=self.__host, port=self.__port,
                                                   user=self.__user, password=self.__password))
            return True
        except Exception as e:
            print("Error:", e)
            return False

    def closeConnection(self):
        """Метод закрытия пулла соединения"""
        if not self.isConnected():
            return
        self.__poolConnections.closeall()

    def isConnected(self) -> bool:
        """Метод проверки соединения с БД"""
        return self.__poolConnections is not None

    @staticmethod
    def __getHashByLoginPwd(login: str, password: str) -> str:
        """Получение хэша для логина и пароля пользователя"""
        combinedStr = f"{login}:{password}"
        hashByLoginPwd = hashlib.sha256(combinedStr.encode('utf-8'))
        return hashByLoginPwd.hexdigest()

    def __insertOperation(self, request: str, args: tuple) -> bool:
        if not self.isConnected():
            return False

        connection = None
        cursor = None
        try:
            connection = self.__poolConnections.getconn()
            if not connection:
                return False
            cursor = connection.cursor()
            if not cursor:
                return False
            cursor.execute(request, args)
            connection.commit()
            return True
        except Exception as e:
            print("Error:", e)
            if connection:
                connection.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
            if connection:
                self.__poolConnections.putconn(connection)

    def __findOperation(self, request: str, args: tuple) -> list:
        if not self.isConnected():
            return []

        connection = None
        cursor = None
        try:
            connection = self.__poolConnections.getconn()
            if not connection:
                return []
            cursor = connection.cursor()
            if not cursor:
                return []
            cursor.execute(request, args)
            return cursor.fetchall()
        except Exception as e:
            print("Error:", e)
            if connection:
                connection.rollback()
            return []
        finally:
            if cursor:
                cursor.close()
            if connection:
                self.__poolConnections.putconn(connection)

    def addWorkProgram(self, idUser: int, folderName: str, filePath: str) -> bool:
        """Метода добавления рабочей программы в базу данных.
        Возвращает true, если пользователь был успешно добавлен"""
        fields = ", ".join(self.__tableWorkProgramsFields)
        request = f"INSERT INTO {self.__tableWorkPrograms} ({fields}) VALUES (%s, %s, %s);"
        args = (idUser, folderName, filePath)
        return self.__insertOperation(request, args)

    def workProgramExists(self, idUser: int, folderName: str, filePath: str) -> bool:
        """Проверка существования записи о рабочей программе."""
        request = f"SELECT 1 FROM {self.__tableWorkPrograms} WHERE idUser = %s AND folder_name = %s AND file_path = %s LIMIT 1"
        args = (idUser, folderName, filePath)
        result = self.__findOperation(request, args)
        return len(result) > 0

    def updateWorkProgramPath(self, idUser: int, folderName: str, filePath: str) -> bool:
        """Обновляет запись о файле программы по идентификатору пользователя и папке."""
        request = f"UPDATE {self.__tableWorkPrograms} SET file_path = %s WHERE idUser = %s AND folder_name = %s"
        args = (filePath, idUser, folderName)
        return self.__insertOperation(request, args)

    def upsertWorkProgram(self, idUser: int, folderName: str, filePath: str) -> bool:
        """Вставка или обновление записи о рабочей программе без изменения схемы БД."""
        if self.workProgramExists(idUser, folderName, filePath):
            return self.updateWorkProgramPath(idUser, folderName, filePath)
        return self.addWorkProgram(idUser, folderName, filePath)

    def getWorkPrograms(self, idUser: int) -> list:
        """
        Метод возвращает загруженные пользователем рабочие планы.
        """
        request = f"SELECT * FROM {self.__tableWorkPrograms} WHERE idUser = %s"
        args = (idUser,)

        result = self.__findOperation(request, args)
        programs = []
        if result:
            programs = [row[DataBaseController.WORK_PROGRAM_FOLDER_INDEX] for row in result]

        return programs

    def checkWorkProgram(self, idUser: int, workProgramFolder: str) -> bool:
        """
        Метод проверяет наличия записи пути workProgramPath для пользователя с
        идентификатором idUser. Нужно для уверенности, что с фронт части путь пришел
        правильно.
        """
        request = f"SELECT * FROM {self.__tableWorkPrograms} WHERE idUser = %s AND folder_name = %s"
        args = (idUser, workProgramFolder)

        result = self.__findOperation(request, args)
        if result:
            return True

        return False

    def getWorkProgramPath(self, idUser: int, workProgramFolder: str):
        request = f"SELECT * FROM {self.__tableWorkPrograms} WHERE idUser = %s AND folder_name = %s"
        args = (idUser, workProgramFolder)

        result = self.__findOperation(request, args)
        path = ""
        if result:
            path = result[0][DataBaseController.WORK_PROGRAM_PATH_INDEX]

        return path



    def addUserFolder(self, idUser: int, filePath: str) -> bool:
        """Метода добавления папки пользователя в базу данных.
        Возвращает true, если пользователь был успешно добавлен"""
        fields = ", ".join(self.__tableUserFolderFields)
        request = f"INSERT INTO {self.__tableUserFolder} ({fields}) VALUES (%s, %s);"
        args = (idUser, filePath)
        return self.__insertOperation(request, args)

    def addUser(self, login: str, password: str) -> bool:
        """Метода добавления пользователя в базу данных.
        Возвращает true, если пользователь был успешно добавлен"""

        userHash = self.__getHashByLoginPwd(login, password)
        fields = ", ".join(self.__tableUsersFields)
        request = f"INSERT INTO {self.__tableUsers} ({fields}) VALUES (%s, %s);"
        args = (login, userHash)
        return self.__insertOperation(request, args)

    def findUserByLoginPassword(self, login: str, password: str) -> dict:
        """Метод нахождения пользователя по логину/паролю из БД.
        Возвращает словарь {id: integer}"""

        userHash = self.__getHashByLoginPwd(login, password)
        request = f"SELECT * from {self.__tableUsers} WHERE password_hash = %s"
        args = (userHash,)
        resultSelect = self.__findOperation(request, args)
        if not resultSelect:
            return {}
        user = resultSelect[0]
        if user:
            return {"id": user[0]}
        return {}

    def findUserByLogin(self, login: str) -> dict:
        """Метод нахождения пользователя только по логину из БД.
        Возвращает словарь {id: integer}"""
        request = f"SELECT * from {self.__tableUsers} WHERE login = %s"
        args = (login,)
        resultSelect = self.__findOperation(request, args)

        if not resultSelect:
            return {}

        user = resultSelect[0]

        if user:
            return {"id": user[0]}
        return {}

    def findUserById(self, idUser: int) -> dict:
        """Метод нахождения пользователя по id из БД.
        Возвращает словарь {id: integer, login: str}"""

        request = f"SELECT * from {self.__tableUsers} WHERE id = %s"
        args = (idUser,)
        resultSelect = self.__findOperation(request, args)
        if not resultSelect:
            return {}
        user = resultSelect[0]
        if len(user) >= 2:
            return {"id": user[0], "login": user[1]}
        return {}

    def addParser(self, universityName: str, parserType: int) -> bool:
        """Метода добавления нового парсера в базу данных.
        Возвращает true, если парсер был успешно добавлен"""
        try:
            fields = ", ".join(self.__tableParsersFields)
            request = f"INSERT INTO {self.__tableParsers} ({fields}) VALUES (%s, %s);"
            args = (universityName, parserType)
            return self.__insertOperation(request, args)
        except Exception as e:
            print("Error:", e)
            return False

    def findParserByType(self, parserType: int) -> str | None:
        """Метода возвращает название университета по типу парсера."""
        request = f"SELECT * FROM {self.__tableParsers} WHERE parserType = %s"
        args = (parserType,)

        result = self.__findOperation(request, args)
        if not result:
            return None
        university = result[0]
        if len(university) < 2:
            return None
        return university[0]

    def findTypeParserByUniversityName(self, universityName: str) -> int | None:
        """Метода возвращает код парсера по названию университета."""
        request = f"SELECT * FROM {self.__tableParsers} WHERE universityName = %s"
        args = (universityName,)

        result = self.__findOperation(request, args)
        if not result:
            return None
        university = result[0]
        if len(university) < 2:
            return None
        return university[1]