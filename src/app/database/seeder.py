import secrets
import string

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import ADMIN_PASSWORD, ADMIN_USERNAME
from database import Admin

NUM_USERS = 1  # Количество генерируемых пользователей
PASSWORD_LENGTH = 17
USERNAME_PREFIX = "user"


def generate_random_string(length: int, chars: str = string.ascii_letters + string.digits) -> str:
    """Генерирует случайную строку заданной длины"""
    return ''.join(secrets.choice(chars) for _ in range(length))


def generate_username() -> str:
    """Генерирует случайное имя пользователя"""
    return f"{USERNAME_PREFIX}_{generate_random_string(8, string.ascii_lowercase + string.digits)}"


def generate_password() -> str:
    """Генерирует случайный пароль"""
    # Обязательно включаем разные типы символов для надёжности
    # chars = string.ascii_letters + string.digits + "!@#$%^&*"
    # return generate_random_string(PASSWORD_LENGTH, chars)
    """Надо подумать как лучше сделать с кешем"""
    return "zDh1lbMu-2qQI"


def generate_users(count: int) -> list[dict]:
    """Генерирует список пользователей со случайными данными"""
    users = []
    for i in range(count):
        users.append({
            "username": generate_username(),
            "password": generate_password(),
        })
    return users


async def clear_all_users(db: AsyncSession) -> int:
    """Удаляет всех существующих пользователей"""

    # Для асинхронной версии
    query = select(Admin)
    result = await db.execute(query)
    users = result.scalars().all()

    for user in users:
        await db.delete(user)

    await db.commit()
    return len(users)


async def seed_users(db: AsyncSession, count: int = NUM_USERS) -> dict:
    """Удаляет старых и создаёт новых тестовых пользователей"""

    # Сначала удаляем всех существующих пользователей
    # deleted_count = await clear_all_users(db)
    # print(f"🗑️  Удалено старых пользователей: {deleted_count}")

    # Генерируем новых пользователей
    new_users = generate_users(count)
    created = []

    for user_data in new_users:
        salt = bcrypt.gensalt()
        user = Admin(
            username=user_data["username"],
            hashed_password=bcrypt.hashpw(user_data["password"].encode('utf-8'), salt).decode('utf-8')
        )
        db.add(user)
        created.append(user_data)

    await db.commit()

    return {
        "created": created,
        # "deleted_count": deleted_count,
    }


async def ensure_default_admin(db: AsyncSession) -> None:
    """Создаёт админа admin/admin, если такого ещё нет (для входа и создания комнат)."""

    result = await db.execute(select(Admin).where(Admin.username == ADMIN_USERNAME))
    if result.scalar_one_or_none() is not None:
        return
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), salt).decode("utf-8")
    admin = Admin(username=ADMIN_USERNAME, hashed_password=hashed)
    db.add(admin)
    await db.commit()


async def run_seeder(db: AsyncSession):
    """Запускает процесс сидинга"""
    try:
        print("🌱 Запуск сидера...")
        print("=" * 50)

        await ensure_default_admin(db)
        # result = await seed_users(db)

        # if result.get("created"):
        #     print(f"✅ Создано новых пользователей: {len(result['created'])}")
        print("✨ Сидинг завершён!")
        print("⚠️  Все старые пользователи были удалены!")

    except Exception as e:
        print(f"❌ Ошибка при сидинге: {e}")
        import traceback
        traceback.print_exc()
