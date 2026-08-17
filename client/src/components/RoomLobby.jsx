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

export default function RoomLobby({ socket, roomCode, setRoomCode, username, setUsername }) {
  
  const [selectedChar, setSelectedChar] = useState(null);
  const [toast, setToast]               = useState("");
  const [roomFlag, setRoomFlag]         = useState(null);

  const navigate = useNavigate();

  // console.log(socket);


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
      setRoomFlag(data.flag); // flag = false don't proceed
      showToast("Room does not exist!");
    })
    return () => socket.off("roomNotExists");
  }, [socket, showToast]);

  useEffect(() => {
    socket.on("joinedRoom", (data) => {
      console.log("Received roomJoined event:", data);
      if(data.flag == true) navigate("/game");
    })
    return () => socket.off("roomJoined");
  }, [socket, showToast]);

  useEffect(() => {
    socket.on("cannot-join-game", (data) => {
      console.log('cannot-join-game event:', data);
      showToast("Cannot join game");
    })

    return () => socket.off("cannot-join-game");
  })

  return (
    <>
      {/* Animated Background */}
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-300 flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Satirical Note */}
        
        <div className="absolute top-60 left-8 rotate-[-40deg] origin-top-left z-10">
          <div className="bg-yellow-200 border-4 border-yellow-600 shadow-2xl p-4 max-w-xs transform hover:scale-105 transition-transform duration-200">
            <p className="text-sm font-bold text-gray-800 leading-relaxed">
              "I am a Back-End developer, not a designer, so of course I used my buddy claude to design me this game"
            </p>
            <div className="absolute -bottom-2 left-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-yellow-600"></div>
          </div>
        </div>

        {/* Floating Shapes Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-16 h-16 bg-yellow-300 rounded-full opacity-50 animate-bounce"></div>
          <div className="absolute top-40 right-20 w-20 h-20 bg-pink-400 rounded-full opacity-40 animate-pulse"></div>
          <div className="absolute bottom-32 left-1/4 w-12 h-12 bg-purple-300 rounded-full opacity-60 animate-bounce delay-100"></div>
          <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-blue-300 rounded-full opacity-30 animate-pulse delay-200"></div>
        </div>

        {/* Main Card */}
        <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl transform hover:scale-[1.02] transition-transform duration-300 border-8 border-purple-600">

          {/* Scrabble Title */}
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            {"SCRIBBLE".split("").map((letter, i) => (
              <div 
                key={i}
                className="relative bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-lg shadow-lg w-12 h-12 flex items-center justify-center transform hover:rotate-12 hover:scale-110 transition-all duration-200 border-2 border-yellow-600"
              >
                <span className="text-2xl font-black text-purple-900">{letter}</span>
                <span className="absolute bottom-0 right-1 text-xs font-bold text-purple-800">{TILE_POINTS[i]}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-bold text-purple-600 mb-6 animate-pulse">Pick your vibe & jump in! 🌟</p>

          {/* Username Input */}
          <p className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-2xl">🏷️</span> Your Name
          </p>
          <input
            className="w-full px-4 py-3 text-lg border-4 border-purple-300 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 outline-none transition-all duration-200 font-semibold text-gray-800 placeholder-gray-400 shadow-md"
            type="text"
            placeholder="Enter your username…"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
          />

          {/* Character Selection */}
          <p className="text-lg font-bold text-gray-700 mb-3 mt-6 flex items-center gap-2">
            <span className="text-2xl">🎭</span> Pick Your Character
          </p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {characters.map(c => (
              <button
                key={c.id}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-4 transition-all duration-200 transform hover:scale-105 hover:-rotate-2 ${
                  selectedChar === c.id 
                    ? 'border-green-500 bg-gradient-to-br from-green-100 to-green-200 shadow-xl scale-105' 
                    : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-purple-400 shadow-md'
                }`}
                onClick={() => setSelectedChar(c.id)}
                title={c.name}
              >
                {selectedChar === c.id && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xl font-bold shadow-lg animate-bounce">
                    ✓
                  </div>
                )}
                <img
                  src={c.img}
                  alt={c.name}
                  className="w-16 h-16 object-cover rounded-xl mb-2"
                  onError={e => { e.currentTarget.src = DEFAULT_FALLBACK; }}
                />
                <span className="text-sm font-bold text-gray-700">{c.name}</span>
              </button>
            ))}
          </div>

          <p className={`text-center text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-300 ${
            selected 
              ? 'text-green-600 bg-green-100 border-2 border-green-400' 
              : 'text-gray-400 bg-gray-50 border-2 border-gray-200'
          }`}>
            {selected ? `✅ ${selected.name} selected!` : "No character chosen yet"}
          </p>

          <hr className="my-6 border-t-4 border-purple-200 rounded-full" />

          {/* Create Room */}
          <p className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-2xl">🏠</span> Create Room
          </p>
          
          <button
            className={`w-full py-4 px-6 text-xl font-black rounded-2xl shadow-xl transform transition-all duration-200 border-4 mb-6 ${
              canProceed
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-purple-700 hover:scale-105 hover:-rotate-1 active:scale-95'
                : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              handleCreate();
              navigate("/game");
            }}
            disabled={!canProceed}
          >
            ✨ Create New Room
          </button>

          {/* Join Room */}
          <p className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-2xl">🔑</span> Join Room
          </p>
          <div className="flex gap-3">
            <input
              className={`flex-1 px-4 py-3 text-lg border-4 rounded-2xl outline-none transition-all duration-200 font-semibold shadow-md ${
                canProceed
                  ? 'border-purple-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 text-gray-800'
                  : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              type="text"
              placeholder="Room code…"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              maxLength={8}
              disabled={!canProceed}
            />
            <button
              className={`px-8 py-3 text-lg font-black rounded-2xl shadow-xl transform transition-all duration-200 border-4 ${
                canProceed
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-blue-700 hover:scale-105 active:scale-95'
                  : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-60'
              }`}
              onClick={() => {
                handleJoin();
              }}
              disabled={!canProceed}
            >
              Join!
            </button>
          </div>

          {!canProceed && (
            <p className="mt-4 text-center text-orange-600 font-bold bg-orange-100 py-2 px-4 rounded-xl border-2 border-orange-300 animate-pulse">
              ⚠️ Fill in name & character to continue
            </p>
          )}

          {toast && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-lg border-4 border-white animate-bounce z-50">
              {toast}
            </div>
          )}
        </div>
      </div>
    </> 
  );
}