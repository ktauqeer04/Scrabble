import { useState, useMemo} from 'react'
import Canvas from './components/Canvas'
import { io } from "socket.io-client";
import './App.css'
import ChatRoom from './components/ChatRoom';
import RoomLobby from './components/RoomLobby';
import { Router, Routes, Route } from 'react-router-dom';
import { useRoom } from './context/RoomContext';

function App() {

  const socket = useMemo(() => io("http://localhost:3000"), []);

  const { roomCode, setRoomCode } = useRoom();

  console.log("Current room code in App.jsx:", roomCode);

  return (
      <Routes>

        {/* Route 1: Lobby */}
        <Route path="/" element={<RoomLobby socket={socket} roomCode={roomCode} setRoomCode={setRoomCode} />} />

        {/* Route 2: Game — Canvas + ChatRoom side by side */}
        <Route path="/game" element={
          <div className="flex h-screen">
            <div className="flex-1 min-w-0 border border-gray-300">
              <Canvas socket={socket} roomCode={roomCode} />
            </div>
            <div className="flex-1 min-w-0 border border-gray-300">
              <div className="flex h-screen items-center justify-center">
                <ChatRoom socket={socket} roomCode={roomCode}/>
              </div>
            </div>
          </div>
        } />

      </Routes>

  );

}

export default App
