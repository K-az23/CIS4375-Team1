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
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1) 
    SETMORE_API_BASE_URL = os.getenv("SETMORE_API_BASE_URL", "")
    SETMORE_REFRESH_TOKEN = os.getenv("SETMORE_REFRESH_TOKEN", "")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
