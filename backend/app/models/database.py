from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.exc import SQLAlchemyError, DBAPIError
from fastapi import HTTPException
import logging
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False
)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def safe_db_operation(operation, error_message="Database operation failed"):
    """Safely execute database operations with error handling"""
    try:
        return await operation()
    except (SQLAlchemyError, DBAPIError) as e:
        logging.error(f"{error_message}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"{error_message}: {str(e)}"
        )
    except Exception as e:
        logging.error(f"Unexpected error in {error_message}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
