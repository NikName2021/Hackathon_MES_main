from sqlalchemy import URL


def get_db_path(user: str, host: str, port: int, database: str, password: str):
    db_path = URL.create(
        drivername="postgresql+asyncpg",
        username=user,
        host=host,
        port=port,
        database=database,
        password=password,
    )
    return db_path
