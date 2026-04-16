import uvicorn
import os
from dotenv import load_dotenv
from main import app

load_dotenv()


if __name__ == "__main__":
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))

    uvicorn.run(app, host=host, port=port)