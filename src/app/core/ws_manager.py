from fastapi import WebSocket
from dataclasses import dataclass, field
import json


@dataclass
class RoomConnection:
    """WebSocket-соединения: админы и игроки в комнате."""
    admin_sockets: list[WebSocket] = field(default_factory=list)
    player_sockets: list[WebSocket] = field(default_factory=list)


class ConnectionManager:
    """
    Управляет WebSocket-соединениями.

    Админ подписывается на комнату → получает события:
    - player_joined  (игрок зашёл)
    - player_left    (игрок вышел, на будущее)
    - room_full      (все 4 зашли)
    """

    def __init__(self):
        # room_id → RoomConnection
        self.rooms: dict[str, RoomConnection] = {}

    async def connect_admin(self, websocket: WebSocket, room_id: str):
        """Админ подключается к отслеживанию комнаты."""
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = RoomConnection()

        self.rooms[room_id].admin_sockets.append(websocket)

    def disconnect_admin(self, websocket: WebSocket, room_id: str):
        """Админ отключился."""
        if room_id in self.rooms:
            self.rooms[room_id].admin_sockets = [
                ws for ws in self.rooms[room_id].admin_sockets
                if ws != websocket
            ]
            self._cleanup_room(room_id)

    def _cleanup_room(self, room_id: str):
        """Удалить комнату, если нет ни админов, ни игроков."""
        if room_id not in self.rooms:
            return
        rc = self.rooms[room_id]
        if not rc.admin_sockets and not rc.player_sockets:
            del self.rooms[room_id]

    async def connect_player(self, websocket: WebSocket, room_id: str):
        """Игрок подключается к комнате (для синхронизации сцены)."""
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = RoomConnection()
        self.rooms[room_id].player_sockets.append(websocket)

    def disconnect_player(self, websocket: WebSocket, room_id: str):
        """Игрок отключился."""
        if room_id in self.rooms:
            self.rooms[room_id].player_sockets = [
                ws for ws in self.rooms[room_id].player_sockets
                if ws != websocket
            ]
            self._cleanup_room(room_id)

    async def notify_player_joined(
            self,
            room_id: str,
            user_id: str,
            username: str,
            role: str,
            members_count: int,
            total: int = 4,
    ):
        """Уведомить всех админов, следящих за комнатой."""
        if room_id not in self.rooms:
            return

        message = {
            "event": "player_joined",
            "data": {
                "user_id": user_id,
                "username": username,
                "role": role,
                "members_count": members_count,
                "total": total,
                "is_full": members_count >= total,
            }
        }

        # Отправляем всем подключённым админам
        dead_sockets = []
        for ws in self.rooms[room_id].admin_sockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.append(ws)

        # Убираем мёртвые соединения
        for ws in dead_sockets:
            self.disconnect_admin(ws, room_id)

    async def notify_room_full(self, room_id: str):
        """Комната заполнена — все 4 игрока подключились."""
        if room_id not in self.rooms:
            return

        message = {
            "event": "room_full",
            "data": {
                "room_id": room_id,
                "message": "Все игроки подключились! Комната готова."
            }
        }

        dead_sockets = []
        for ws in self.rooms[room_id].admin_sockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.disconnect_admin(ws, room_id)

    async def broadcast_scene_update(
            self,
            room_id: str,
            payload: dict,
            exclude_websocket: WebSocket | None = None,
    ):
        """
        Разослать обновление сцены всем игрокам комнаты (и админам).
        exclude_websocket — не слать отправителю.
        """
        if room_id not in self.rooms:
            return

        message = {
            "event": "scene_update",
            "data": payload,
        }

        all_sockets = (
            self.rooms[room_id].player_sockets + self.rooms[room_id].admin_sockets
        )
        dead = []
        for ws in all_sockets:
            if ws is exclude_websocket:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            if ws in self.rooms[room_id].player_sockets:
                self.disconnect_player(ws, room_id)
            else:
                self.disconnect_admin(ws, room_id)


manager = ConnectionManager()