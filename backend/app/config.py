import os
from datetime import timedelta
from typing import ClassVar
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


def _database_uri():
    user = quote_plus(os.getenv("DB_USER", ""))
    password = quote_plus(os.getenv("DB_PASSWORD", ""))
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME", "")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"


class Config:
    CLIENT_URL: ClassVar[str] = os.getenv("CLIENT_URL", "http://localhost:5173")
    SQLALCHEMY_DATABASE_URI: ClassVar[str] = _database_uri()
    SQLALCHEMY_ENGINE_OPTIONS: ClassVar[dict] = {"pool_pre_ping": True, "pool_recycle": 1800}
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30) # keeping to 30 min for now, better to change to an hour with refresh mechanism