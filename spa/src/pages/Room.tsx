import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const ROOM_ID = "ROOM-1234";
const BASE_URL = "http://localhost:5173";

type Role = "DISPATCHER" | "RTP" | "NSH";

const INVITES: { role: Role; label: string; token: string }[] = [
  { role: "DISPATCHER", label: "Диспетчер (Д)", token: "TOKEN-D-AAAA" },
  {
    role: "RTP",
    label: "Руководитель тушения пожара (РТП)",
    token: "TOKEN-RTP-BBBB",
  },
  { role: "NSH", label: "Начальник штаба (НШ)", token: "TOKEN-NSH-CCCC" },
];

export const RoomPage = () => {
  const [copiedRole, setCopiedRole] = useState<Role | null>(null);
  const { roomId } = useParams();
  console.log(roomId)
  const links = useMemo(() => {
    return INVITES.map((i) => ({
      ...i,
      url: `${BASE_URL}/join?room=${encodeURIComponent(ROOM_ID)}&role=${encodeURIComponent(
        i.role,
      )}&token=${encodeURIComponent(i.token)}`,
    }));
  }, []);

  async function copy(text: string, role: Role) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRole(role);
      window.setTimeout(
        () => setCopiedRole((r) => (r === role ? null : r)),
        1200,
      );
    } catch {
      prompt("Скопируйте ссылку вручную:", text);
    }
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Комната создана</h1>

      <div
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <b>Room ID:</b> {ROOM_ID}
        </div>
        <div>
          <b>Ваша роль:</b> Администратор
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Ссылки для подключения</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {links.map((l) => (
          <div
            key={l.role}
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{l.label}</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={l.url}
                readOnly
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid #ccc",
                  borderRadius: 10,
                }}
              />
              <button
                onClick={() => copy(l.url, l.role)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #aaa",
                  background: "white",
                  cursor: "pointer",
                  minWidth: 120,
                }}
              >
                {copiedRole === l.role ? "Скопировано" : "Скопировать"}
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              Можно открыть эту ссылку напрямую в браузере или вставить в поле
              “Присоединиться к комнате”.
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: "#666" }}>
        Заглушка: ссылки и токены — константы. Позже ROOM_ID и token будут
        генерироваться и проверяться на бэкенде.
      </div>
    </div>
  );
};
