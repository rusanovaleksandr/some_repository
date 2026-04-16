from fastapi import APIRouter, Body, Depends, status
from fastapi.responses import JSONResponse
from src.dataBase.dependencies import get_db
from src.dataBase.dataBaseStructs import Topic, User, WorkProgram
from src.dataBase.dataBaseController import DataBaseController
from src.api.translator import translate_work_program_values
from src.configs import mapParsersFromTypeToObject
import os
from pathlib import Path
import json
import tempfile
from typing import Any
from fastapi import UploadFile, File, Form

router = APIRouter()


def _parse_front_work_program_payload(payload: dict[str, Any]) -> list[WorkProgram]:
    """Преобразует payload фронтенда в список WorkProgram."""
    if "idUser" not in payload:
        raise ValueError("Field 'idUser' is required")

    id_user = payload.get("idUser")
    if not isinstance(id_user, int):
        raise ValueError("Field 'idUser' must be integer")

    name_university = payload.get("nameUniversity", "frontend")
    if not isinstance(name_university, str) or not name_university.strip():
        name_university = "frontend"

    name_direction_override = payload.get("nameDirection")

    meta_keys = {"idUser", "nameUniversity", "nameDirection"}
    program_entries = [(k, v) for k, v in payload.items() if k not in meta_keys]
    if len(program_entries) != 1:
        raise ValueError("Payload must contain exactly one program root key")

    root_program_name, disciplines = program_entries[0]
    if not isinstance(disciplines, list):
        raise ValueError("Program value must be a list of disciplines")

    name_direction = name_direction_override or root_program_name
    result: list[WorkProgram] = []

    for discipline_item in disciplines:
        if not isinstance(discipline_item, dict) or len(discipline_item) != 1:
            raise ValueError("Each discipline item must be an object with one key")

        discipline_name, discipline_data = next(iter(discipline_item.items()))
        if not isinstance(discipline_data, dict):
            raise ValueError("Discipline data must be an object")

        previous_disciplines = discipline_data.get("previousDisciplines", [])
        if not isinstance(previous_disciplines, list):
            raise ValueError("previousDisciplines must be a list")

        topics_payload = discipline_data.get("topics", [])
        if not isinstance(topics_payload, list):
            raise ValueError("topics must be a list")

        topics: dict[str, Topic] = {}
        for topic_item in topics_payload:
            if not isinstance(topic_item, dict):
                continue
            for topic_name, educational_units in topic_item.items():
                if not isinstance(educational_units, list):
                    continue
                topics[str(topic_name)] = Topic(educationalUnits=[str(unit) for unit in educational_units])

        result.append(
            WorkProgram(
                idUser=id_user,
                nameUniversity=str(name_university),
                nameDirection=str(name_direction),
                nameWorkProgram=str(discipline_name),
                previousDisciplines=[str(item) for item in previous_disciplines],
                topics=topics,
            )
        )

    if not result:
        raise ValueError("No work programs in payload")

    return result

def uploadFileWorkProgram(pathWorkProgram: Path, workProgram: WorkProgram) -> tuple[bool, bool]:
    """Метод загрузки файла учебной и создания папок с университетом и направлением"""
    isExistDirectionPath = False
    isExistWorkProgramPath = False
    if pathWorkProgram.parent.exists():
        isExistDirectionPath = True
    pathWorkProgram.parent.mkdir(parents=True, exist_ok=True)
    topicsDictionary = {}
    for topic_name, topic_data in workProgram.topics.items():
        topicsDictionary[topic_name] = {
            "subtopics": topic_data.educationalUnits
        }

    programWorkDictionary = {
        workProgram.nameDirection: {
            workProgram.nameWorkProgram: {
                "previousDisciplines": workProgram.previousDisciplines,
                "topics": topicsDictionary
            }
        }
    }
    if pathWorkProgram.exists():
        isExistWorkProgramPath = True

    with tempfile.NamedTemporaryFile('w', encoding='utf-8', delete=False, dir=str(pathWorkProgram.parent), suffix='.tmp') as temp_file:
        json.dump(programWorkDictionary, temp_file, indent=4, ensure_ascii=False)
        temp_path = Path(temp_file.name)

    os.replace(temp_path, pathWorkProgram)

    return isExistDirectionPath, isExistWorkProgramPath


def uploadJsonFile(pathToFile: Path, content: dict[str, Any]) -> tuple[bool, bool]:
    """Атомарно сохраняет произвольный JSON в файл."""
    isExistDirectoryPath = pathToFile.parent.exists()
    isExistFilePath = pathToFile.exists()

    pathToFile.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile('w', encoding='utf-8', delete=False, dir=str(pathToFile.parent), suffix='.tmp') as temp_file:
        json.dump(content, temp_file, indent=4, ensure_ascii=False)
        temp_path = Path(temp_file.name)

    os.replace(temp_path, pathToFile)

    return isExistDirectoryPath, isExistFilePath

@router.post("/login")
def login(user: User, db: DataBaseController = Depends(get_db)):
    """Метод обработки входа пользователя.
    Возвращает код и ответ в формате.
    {responseMessage: {сообщение от сервера}, id: {id пользователя в БД, если он найден}}"""
    if not db.isConnected():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase connect error!"}
        )
    result = db.findUserByLoginPassword(user.login, user.password)
    if "id" not in result:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"responseMessage": "User not found!"}
        )
    return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"responseMessage": "ok", "id": result["id"]}
    )

@router.post("/registration")
def registration(user: User, db: DataBaseController = Depends(get_db)):
    """Метод обработки регистрации пользователя.
    Возвращает код и ответ в формате:
    {responseMessage: {сообщение от сервера}, id: {id пользователя в БД, если он найден}}"""
    if not db.isConnected():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase connect error!"}
        )

    find_result = db.findUserByLogin(user.login)

    if "id" in find_result:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"responseMessage": "This login is already in use!"}
        )

    add_result = db.addUser(user.login, user.password)

    if add_result:
        find_result = db.findUserByLogin(user.login)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"responseMessage": "User was successfully registered!", "id": find_result["id"]}
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"responseMessage" : "Cannot register user due to server error!"}
    )

@router.post("/add-program")
def addProgram(payload: Any = Body(...), db: DataBaseController = Depends(get_db)):
    """Метод добавления учебной программы.
    Возвращает код и ответ в формате.
    {responseMessage: {сообщение от сервера}}"""
    if not db.isConnected():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase connect error!"}
        )
    is_front_payload = isinstance(payload, dict) and "nameWorkProgram" not in payload

    try:
        if is_front_payload:
            if "idUser" not in payload or not isinstance(payload["idUser"], int):
                raise ValueError("Field 'idUser' is required and must be integer")
            id_user = payload["idUser"]
        else:
            work_programs = [WorkProgram.model_validate(payload)]
            id_user = work_programs[0].idUser
    except Exception as error:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"responseMessage": "Invalid add-program payload", "error": str(error)}
        )

    user = db.findUserById(id_user)
    if len(user) == 0:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"responseMessage": "Not find current user!"}
        )

    pathStorage = Path(os.getenv('LOCAL_PATH_TO_STORAGE'))
    translation_warnings: list[str] = []

    if is_front_payload:
        name_university = payload.get("nameUniversity", "frontend")
        if not isinstance(name_university, str) or not name_university.strip():
            name_university = "frontend"

        name_direction_override = payload.get("nameDirection")
        if name_direction_override is not None and (not isinstance(name_direction_override, str) or not name_direction_override.strip()):
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"responseMessage": "Invalid add-program payload", "error": "Field 'nameDirection' must be non-empty string"}
            )

        meta_keys = {"idUser", "nameUniversity", "nameDirection"}
        program_entries = [(k, v) for k, v in payload.items() if k not in meta_keys]
        if len(program_entries) != 1:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"responseMessage": "Invalid add-program payload", "error": "Payload must contain exactly one program root key"}
            )

        root_program_name, disciplines = program_entries[0]
        if not isinstance(root_program_name, str) or not root_program_name.strip() or not isinstance(disciplines, list):
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"responseMessage": "Invalid add-program payload", "error": "Program root key must be string and value must be list"}
            )

        name_direction = name_direction_override or root_program_name
        final_program_json: dict[str, Any] = {root_program_name: {}}
        translated_fields_count = 0

        for discipline_item in disciplines:
            if not isinstance(discipline_item, dict) or len(discipline_item) != 1:
                continue

            discipline_name, discipline_data = next(iter(discipline_item.items()))
            if not isinstance(discipline_data, dict):
                continue

            previous_disciplines = discipline_data.get("previousDisciplines", [])
            topics_payload = discipline_data.get("topics", [])
            if not isinstance(previous_disciplines, list):
                previous_disciplines = []
            if not isinstance(topics_payload, list):
                topics_payload = []

            topics_for_translate: dict[str, Topic] = {}
            for topic_item in topics_payload:
                if not isinstance(topic_item, dict):
                    continue
                for topic_name, subtopics in topic_item.items():
                    if isinstance(subtopics, list):
                        topics_for_translate[str(topic_name)] = Topic(educationalUnits=[str(unit) for unit in subtopics])

            work_program_for_translate = WorkProgram(
                idUser=id_user,
                nameUniversity=str(name_university),
                nameDirection=str(name_direction),
                nameWorkProgram=str(discipline_name),
                previousDisciplines=[str(item) for item in previous_disciplines],
                topics=topics_for_translate,
            )

            try:
                translated_program, translation_stats = translate_work_program_values(work_program_for_translate)
                translated_fields_count += translation_stats.translated_fields_count
            except Exception as error:
                translated_program = work_program_for_translate
                translation_warnings.append(str(error))

            final_program_json[root_program_name][translated_program.nameWorkProgram] = {
                "previousDisciplines": translated_program.previousDisciplines,
                "topics": {
                    topic_name: {"subtopics": topic_data.educationalUnits}
                    for topic_name, topic_data in translated_program.topics.items()
                }
            }

        pathWorkProgram = Path(name_university) / name_direction / f"{root_program_name}_{id_user}.json"
        isExistDirectionPath, isExistWorkProgramPath = uploadJsonFile(pathStorage / pathWorkProgram, final_program_json)

        if not isExistDirectionPath:
            addResult = db.addUserFolder(id_user, str(pathWorkProgram.parent))
            if not addResult:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={"responseMessage": "DataBase add user folder error!"}
                )

        addResult = db.upsertWorkProgram(id_user, str(pathWorkProgram.parent), str(pathWorkProgram))
        if not addResult:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"responseMessage": "DataBase add/update user file error!"}
            )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "responseMessage": "ok",
                "savedCount": 1,
                "isOverwritten": isExistWorkProgramPath,
                "savedFilePath": str(pathWorkProgram),
                "savedFilePaths": [str(pathWorkProgram)],
                "translatedFieldsCount": translated_fields_count,
                "translationSkipped": len(translation_warnings) > 0,
                "translationWarnings": translation_warnings
            }
        )

    saved_paths: list[str] = []
    overwritten_count = 0
    translated_fields_count = 0

    for workProgram in work_programs:
        try:
            translated_program, translation_stats = translate_work_program_values(workProgram)
            translated_fields_count += translation_stats.translated_fields_count
        except Exception as error:
            translated_program = workProgram
            translation_warnings.append(str(error))

        pathWorkProgram = (Path(workProgram.nameUniversity) / workProgram.nameDirection /
                           f"{workProgram.nameWorkProgram}_{workProgram.idUser}.json")
        isExistDirectionPath, isExistWorkProgramPath = uploadFileWorkProgram(pathStorage / pathWorkProgram, translated_program)
        if isExistWorkProgramPath:
            overwritten_count += 1

        if not isExistDirectionPath:
            addResult = db.addUserFolder(translated_program.idUser, str(pathWorkProgram.parent))
            if not addResult:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={"responseMessage": "DataBase add user folder error!"}
                )

        addResult = db.upsertWorkProgram(translated_program.idUser, str(pathWorkProgram.parent), str(pathWorkProgram))
        if not addResult:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"responseMessage": "DataBase add/update user file error!"}
            )

        saved_paths.append(str(pathWorkProgram))

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "responseMessage": "ok",
            "savedCount": len(saved_paths),
            "isOverwritten": overwritten_count > 0,
            "savedFilePath": saved_paths[0] if saved_paths else "",
            "savedFilePaths": saved_paths,
            "translatedFieldsCount": translated_fields_count,
            "translationSkipped": len(translation_warnings) > 0,
            "translationWarnings": translation_warnings
        }
    )

@router.get("/get-programs")
def getPrograms(userId : int, db: DataBaseController = Depends(get_db)):
    if not db.isConnected():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase connect error!"}
        )

    programs = db.getWorkPrograms(userId)
    
    return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={ "programs": programs }
        )

@router.get("/show-graph")
def getCertainProgram(userId: int, pathToProgramFolder: str, db: DataBaseController = Depends(get_db)):
    isProgramExist = db.checkWorkProgram(userId, pathToProgramFolder)
    if not isProgramExist:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"responseMessage": "Work program not found"}
        )

    pathStorage = Path(os.getenv('LOCAL_PATH_TO_STORAGE'))
    workProgramPath = pathStorage / db.getWorkProgramPath(userId, pathToProgramFolder)

    if not workProgramPath.is_file():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"responseMessage": "Work program not found"}
        )
    
    try:
        with open(workProgramPath, 'r', encoding="utf-8") as fileWorkProgramJson:
            programData = json.load(fileWorkProgramJson)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=programData
        )
        
    except Exception as ex:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": f"Error reading file: {str(ex)}"}
        )


@router.get("/get-available-universities")
def getAvailableUniversities(db: DataBaseController = Depends(get_db)):
    if not db.isConnected():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase connect error!"}
        )
    resultList = []
    for type in mapParsersFromTypeToObject:
        university = db.findParserByType(type)
        if university:
            resultList.append(university)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"available-universities": resultList}
    )

@router.post("/add-program-from-files")
async def add_program_from_files(
    files: list[UploadFile] = File(...),
    university_name: str = Form(...),
    id_user: int = Form(...),
    db: DataBaseController = Depends(get_db)):
    """
    Метод добавления учебной программы из файлов.
    Возвращает код и ответ в формате.
    {responseMessage: {сообщение от сервера}}
    """

    # проверка подключения к БД
    if not db.isConnected():
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase connection error!"})

    # проверка наличия пользователя
    user = db.findUserById(id_user)
    if len(user) == 0:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"responseMessage": "Invalid user!"})

    # нахождения типа парсера методом из findTypeParserByUniversityName из контроллера 
    parser_type = db.findTypeParserByUniversityName(university_name)
    if parser_type is None:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"responseMessage": f"Parser for university '{university_name}' does not exist!"})

    # подготовка данных файлов для парсера(преобразование из UploadFile в байты, нужно понять конкретно по формату, потому что это не дело)
    files_data = []
    for file in files:
        file_bytes = await file.read()
        files_data.append((file.filename, file_bytes))
    # ===========================================================

    # создание парсера и парсинг
    # используется словарь из configs.py
    parser_class = mapParsersFromTypeToObject[parser_type]
    parser = parser_class()
    result = parser.parse(files_data, university_name)

    has_disciplines = any(
        isinstance(value, list) and len(value) > 0 for value in result.values()
    ) if isinstance(result, dict) else False

    if not result or not isinstance(result, dict) or not has_disciplines:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"responseMessage": "Files parsing failed!"})

    # сохранение результата
    pathStorage = Path(os.getenv('LOCAL_PATH_TO_STORAGE'))
    pathWorkProgram = Path(university_name) / f"{university_name}_{id_user}.json"
    isExistDirectionPath, isExistFilePath = uploadJsonFile(pathStorage / pathWorkProgram, result)

    # проверка наличия/создание папки пользователя в бд
    if not isExistDirectionPath:
        addResult = db.addUserFolder(id_user, str(pathWorkProgram.parent))
        if not addResult:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"responseMessage": "DataBase adding in user folder error!"})

    # добавление файла в папке пользователя в бд(если папка была изначально)
    addResult = db.upsertWorkProgram(id_user, str(pathWorkProgram.parent), str(pathWorkProgram))
    if not addResult:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"responseMessage": "DataBase add/update user file error!"})

    # ответ в случае успешного парсинга и сохранения файлов
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "responseMessage": "ok",
            "savedCount": 1,
            "isOverwritten": isExistFilePath,
            "savedFilePath": str(pathWorkProgram),
            "savedFilePaths": [str(pathWorkProgram)]}) 