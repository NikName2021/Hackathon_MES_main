from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from database import User, Admin
from helpers import hash_password

"""Артемка, Левка и Мишка не бейте( 
В следующих коммитах поменяем"""


SEED_USERS = [
    {
        "username": "admin",
        "password": "admin123",

    }
]


async def seed_users(db: AsyncSession) -> dict:
    """Создаёт тестовых пользователей для каждой роли"""

    created = []
    skipped = []

    for user_data in SEED_USERS:
        query = select(Admin).where(
            or_(
                Admin.username == user_data["username"]
            )
        )

        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            skipped.append(user_data["username"])
            continue

        user = Admin(
            username=user_data["username"],
            hashed_password=user_data["password"],
        )

        db.add(user)
        created.append(user_data["username"])

    await db.commit()

    return {
        "created": created,
        "skipped": skipped,
    }


async def clear_users(db: Session) -> int:
    """Удаляет всех пользователей (осторожно!)"""
    count = db.query(User).delete()
    await db.commit()
    return count


async def run_seeder(db: AsyncSession):
    try:
        print("🌱 Запуск сидера...")
        print("-" * 40)

        result = await seed_users(db)

        if result.get("created"):
            print("✅ Созданы пользователи:")
            for email in result["created"]:
                print(f"   - {email}")

        if result.get("skipped"):
            print("⏭️  Пропущены (уже существуют):")
            for email in result["skipped"]:
                print(f"   - {email}")

        print("-" * 40)
        print("📋 Данные для входа:")
        print()

        for user_data in SEED_USERS:
            print(f"   Email: {user_data['username']}")
            print(f"   Password: {user_data['password']}")
            print()

        print("✨ Сидинг завершён!")

    except Exception as e:
        print(f"❌ Ошибка при сидинге: {e}")
