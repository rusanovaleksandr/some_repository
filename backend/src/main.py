from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.dataBase.dependencies import get_db


app = FastAPI(title="EduProgram API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def on_startup() -> None:
    db = get_db()
    db.openConnection()


@app.on_event("shutdown")
def on_shutdown() -> None:
    db = get_db()
    db.closeConnection()
