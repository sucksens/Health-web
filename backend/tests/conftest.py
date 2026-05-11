import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test-secret-key-for-pytest-that-is-long-enough-32chars",
)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_health.db")
os.environ.setdefault("CORS_ORIGINS", "[]")

from app.database.db import Base, get_db
from app.database.seed import seed_db
from app.main import app

from starlette.testclient import TestClient


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(
        "sqlite:///./test_health.db",
        connect_args={"check_same_thread": False},
    )
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)
    eng.dispose()
    try:
        os.remove("test_health.db")
    except FileNotFoundError:
        pass


@pytest.fixture(scope="function")
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    TestSession = sessionmaker(bind=connection, expire_on_commit=False)
    session = TestSession()

    seed_db(session)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def register_user(client):
    def _register(
        username="testuser", email="testuser@test.com", password="test123456"
    ):
        r = client.post(
            "/api/v1/auth/register",
            json={"email": email, "username": username, "password": password},
        )
        return r

    return _register


@pytest.fixture
def user_client(client, register_user):
    register_user()
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "test123456"},
    )
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers
