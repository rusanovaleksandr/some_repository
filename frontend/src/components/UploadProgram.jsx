import React, { useState, useRef, useEffect } from "react";
import "./UploadProgram.css";

// Настройки IndexedDB
const dbName = "ProgramFilesDB";
const storeName = "files";

// Открытие базы данных
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
  });
};

// Сохранение файлов в IndexedDB
const saveFilesToDB = async (files) => {
  const db = await openDB();
  const transaction = db.transaction([storeName], "readwrite");
  const store = transaction.objectStore(storeName);

  store.clear();

  for (const file of files) {
    store.put({
      id: file.name + "_" + file.lastModified,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      file: file,
    });
  }
};

// Загрузка файлов из IndexedDB
const loadFilesFromDB = async () => {
  const db = await openDB();
  const transaction = db.transaction([storeName], "readonly");
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const filesData = request.result;
      const files = filesData.map((data) => data.file);
      resolve(files);
    };
    request.onerror = () => reject(request.error);
  });
};

export default function UploadProgram() {
  const domain =
    process.env.REACT_APP_API_URL_GET_PROGRAMMS ||
    process.env.REACT_APP_API_URL ||
    "localhost:8000";

  const [files, setFiles] = useState([]);
  const [university, setUniversity] = useState("");
  const inputRef = useRef();
  const [arrayUniversities, setArrayUniversities] = useState([]);

  // Загрузка сохраненных файлов и университета
  useEffect(() => {
    loadFilesFromDB()
      .then((savedFiles) => {
        if (savedFiles && savedFiles.length > 0) {
          setFiles(savedFiles);
          console.log(`Загружено ${savedFiles.length} файлов из IndexedDB`);
        }
      })
      .catch((err) => console.error("Ошибка загрузки файлов:", err));

    const savedUniversity = localStorage.getItem("selectedUniversity");
    if (savedUniversity) {
      setUniversity(savedUniversity);
    }
  }, []);

  useEffect(() => {
    const getDisciplines = async () => {
      try {
        const response = await fetch(`http://${domain}/get-available-universities`);
        let data = await response.json();
        
        data = data["available-universities"];

        if (data == null) {
          throw new Error("Ошибка: (null/undefined)");
        }
        if (!Array.isArray(data)) {
          throw new Error("Ошибка: Ожидался массив университетов");
        }
        if (data.length === 0) {
          console.warn("Ошибка: Пустой массив");
          setArrayUniversities([]);
          return;
        }
        const isValid = data.every(
            (item) => typeof item === "string" && item.trim() !== ""
        );
        if (!isValid) {
          throw new Error("Ошибка: Некорректные данные");
        }

        setArrayUniversities(data);
      } catch (error) {
        console.error("Ошибка:", error);
      }
    };

    getDisciplines();
  }, []);

  // Сохранение файлов при изменении
  useEffect(() => {
    saveFilesToDB(files);
  }, [files]);

  // Сохранение университета
  useEffect(() => {
    if (university) {
      localStorage.setItem("selectedUniversity", university);
    }
  }, [university]);

  // Выбор файлов через диалог
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e) => e.preventDefault();

  // Удаление файла
  const removeFile = async (index) => {
    const fileToRemove = files[index];

    const db = await openDB();
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    store.delete(fileToRemove.name + "_" + fileToRemove.lastModified);

    setFiles(files.filter((_, i) => i !== index));
  };

  // Отправка формы
  const handleSubmit = async () => {
    if (!university) {
      alert("Пожалуйста, выберите университет");
      return;
    }
    if (files.length === 0) {
      alert("Пожалуйста, выберите файлы");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("university_name", university);
    formData.append("id_user", localStorage.getItem("userId"));

    try {
      const response = await fetch(
        `http://${domain}/add-program-from-files`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (response.ok) alert("Отправлено!");
      else alert("Ошибка при отправке");
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при отправке");
    }
  };

  return (
    <div className="wrapper">
      <div className="card">
        <h2>Загрузка рабочей программы</h2>

        {/* Выбор университета */}
        <select
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          className="select"
        >
          <option value="">Выберите университет</option>
          {arrayUniversities.map((uni) => (
            <option key={uni} value={uni}>
              {uni}
            </option>
          ))}
        </select>

        {/* Drag & Drop */}
        <div
          className="dropZone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current.click()}
        >
          Перетащите файлы или нажмите для выбора
        </div>

        <input
          type="file"
          multiple
          ref={inputRef}
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {files.length > 0 && (
          <ul className="fileList">
            {files.map((file, index) => (
              <li key={index} className="fileItem">
                <span className="fileName" title={file.name}>
                  {file.name}
                </span>
                <button onClick={() => removeFile(index)}>X</button>
              </li>
            ))}
          </ul>
        )}

        <button onClick={handleSubmit} className="button">
          Отправить
        </button>
      </div>
    </div>
  );
}