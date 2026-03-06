import { useState, useEffect } from "react";
import "../styles/RoomLobby.css";
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';


// ─── Import your 8 character PNGs here ────────────────────────────────────
// Replace these paths with your actual file paths.
// If any image fails to load, a default 🎭 tile is shown automatically.
// import char1 from "./assets/characters/char1.png";
// import char2 from "./assets/characters/char2.png";
// import char3 from "./assets/characters/char3.png";
// import char4 from "./assets/characters/char4.png";
// import char5 from "./assets/characters/char5.png";
// import char6 from "./assets/characters/char6.png";
// import char7 from "./assets/characters/char7.png";
// import char8 from "./assets/characters/char8.png";
// // ──────────────────────────────────────────────────────────────────────────

const DEFAULT_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='32'%3E%F0%9F%8E%AD%3C/text%3E%3C/svg%3E";

const TILE_POINTS = [3, 3, 1, 3, 3, 1, 2, 1]; // S C R A B B L E

const characters = [
  { id: 1, name: "Hero",    img: DEFAULT_FALLBACK },
  { id: 2, name: "Fox",     img: DEFAULT_FALLBACK },
  { id: 3, name: "Frog",    img: DEFAULT_FALLBACK },
  { id: 4, name: "Robot",   img: DEFAULT_FALLBACK },
  { id: 5, name: "Mermaid", img: DEFAULT_FALLBACK },
  { id: 6, name: "Unicorn", img: DEFAULT_FALLBACK },
  { id: 7, name: "Alien",   img: DEFAULT_FALLBACK },
  { id: 8, name: "Dragon",  img: DEFAULT_FALLBACK },
];

export default function RoomLobby({ socket, roomCode, setRoomCode }) {
  const [username, setUsername]         = useState("");
  const [selectedChar, setSelectedChar] = useState(null);
  const [toast, setToast]               = useState("");
  const [roomFlag, setRoomFlag]         = useState(false);

  const navigate = useNavigate();

  console.log(socket);


  const canProceed = username.trim().length > 0 && selectedChar !== null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleCreate = () => {
    if (!canProceed) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    showToast(`Room created! Code: ${code}`);

    socket.emit("createRoom", { room: code, username: username, characterId: selectedChar });

  };

  const handleJoin = () => {
    if (!canProceed) return;
    if (!roomCode.trim()) { showToast("Enter a room code first!"); return; }
    showToast(`Joining room ${roomCode.toUpperCase()}…`);
    socket.emit("joinRoom", { room: roomCode, username: username, characterId: selectedChar });
  };

  const selected = characters.find(c => c.id === selectedChar);

  useEffect(() => {
    socket.on("roomNotExists", (data) => {
      console.log("Received roomNotExists event:", data);
      setRoomFlag(data.flag);
      showToast("Room does not exist!");
    })
    return () => socket.off("roomNotExists");
  }, [socket, showToast]);

  useEffect(() => {
    socket.on("joinedRoom", (data) => {
      console.log("Received roomJoined event:", data);
      setRoomFlag(data.flag);
    })
    return () => socket.off("roomJoined");
  }, [socket, showToast]);

  return (
    <>
      

      <div className="page">
        <div className="card">

          {/* ── Scrabble Title ── */}
          <div className="scrabble-title">
            {"SCRABBLE".split("").map((letter, i) => (
              <div className="tile" key={i}>
                {letter}
                <span className="tile-pts">{TILE_POINTS[i]}</span>
              </div>
            ))}
          </div>
          <p className="subtitle">Pick your vibe & jump in! 🌟</p>

          {/* ── Username ── */}
          <p className="label">🏷️ Your Name</p>
          <input
            className="field"
            type="text"
            placeholder="Enter your username…"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
          />

          {/* ── Character Selection ── */}
          <p className="label">🎭 Pick Your Character</p>
          <div className="char-grid">
            {characters.map(c => (
              <button
                key={c.id}
                className={`char-btn${selectedChar === c.id ? " selected" : ""}`}
                onClick={() => setSelectedChar(c.id)}
                title={c.name}
              >
                <img
                  src={c.img}
                  alt={c.name}
                  className="char-img"
                  onError={e => { e.currentTarget.src = DEFAULT_FALLBACK; }}
                />
                <span className="char-name">{c.name}</span>
              </button>
            ))}
          </div>

          <p className={`selected-info${selected ? " active" : ""}`}>
            {selected ? `✅ ${selected.name} selected!` : "No character chosen yet"}
          </p>

          <hr className="divider" />

          {/* ── Create Room ── */}
          <p className="label">🏠 Create Room</p>
          
          <button
            className="btn btn-create"
            onClick={() => {
              handleCreate();
              navigate("/game");
            }}
            disabled={!canProceed}
          >
            ✨ Create New Room
          </button>

          {/* ── Join Room ── */}
          <p className="label">🔑 Join Room</p>
          <div className="join-row">
            <input
              className="field field-inline"
              type="text"
              placeholder="Room code…"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              maxLength={8}
              disabled={!canProceed}
            />
            <button
              className="btn btn-join"
              onClick={() => {
                handleJoin();
                if(!roomFlag) navigate("/game");
              }}
              disabled={!canProceed}
            >
              Join!
            </button>
          </div>

          {!canProceed && (
            <p className="warn">⚠️ Fill in name & character to continue</p>
          )}

          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>
    </> 
  );
}