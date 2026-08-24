"""Shared test fixtures for unit and API tests."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Generator
from pathlib import Path
import json

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import fakeredis.aioredis as fakeredis

from app.core.config.settings import Settings
from app.infrastructure.database.base import Base
from app.infrastructure.cache.redis_client import RedisClient, get_redis_client


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    return Settings(
        app_env="testing",
        debug=True,
        database_url="sqlite+aiosqlite:///:memory:",  # Use in-memory SQLite for super-fast tests
        signing_secret_key="test_signing_secret_key_long_enough_32_bytes",
        policy_data_dir=Path("./data/policies"),
    )


@pytest_asyncio.fixture(scope="session")
async def test_engine(test_settings):
    # For testing, we use standard async sqlite in-memory
    engine = create_async_engine(test_settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    SessionFactory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with SessionFactory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def fake_redis() -> AsyncGenerator[RedisClient, None]:
    # Mock Redis client using fakeredis
    server = fakeredis.FakeServer()
    redis_conn = fakeredis.FakeRedis(server=server, decode_responses=True)
    client = RedisClient(redis_conn)
    yield client
    await client.close()


@pytest_asyncio.fixture
async def api_client(test_settings, db_session, fake_redis) -> AsyncGenerator[AsyncClient, None]:
    # Override dependencies
    from app.infrastructure.database.session import get_async_session
    from app.infrastructure.cache.redis_client import get_redis_client
    from main import create_app

    app = create_app()

    async def override_db():
        yield db_session

    app.dependency_overrides[get_async_session] = override_db

    # Seed mock redis
    # Add default policy rules into cache mock to avoid file loads in testing
    default_policy = {
        "platform": "default",
        "version": "1.0.0",
        "rules": [
            {
                "id": "RULE-DEF-001",
                "strategy": "MIN_LENGTH",
                "field": "title",
                "min_length": 5,
                "severity": "MEDIUM"
            }
        ],
        "recommendations": []
    }
    await fake_redis.set_json("floor07:policy:default", default_policy)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
