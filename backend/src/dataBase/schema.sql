CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_folders (
    id SERIAL PRIMARY KEY,
    idUser INT NOT NULL,
    folder_name VARCHAR(255) NOT NULL,

    CONSTRAINT fk_user_folders_login
        FOREIGN KEY (idUser)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    idUser INT NOT NULL,
    folder_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,

    CONSTRAINT fk_uploaded_files_login
        FOREIGN KEY (idUser)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ParserType (
    universityName  VARCHAR(255) PRIMARY KEY,
    parserType  INT NOT NULL
);