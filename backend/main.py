from fastapi import FastAPI
from src.api.routes import router
from src.dataBase.dependencies import get_db
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:3001",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

app.include_router(router)

db = get_db()

@app.on_event("startup")
async def startup_event():
    db.openConnection()

@app.on_event("shutdown")
async def startup_event():
    db.closeConnection()
