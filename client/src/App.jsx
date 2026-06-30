import { useState, useMemo} from 'react'
import Canvas from './components/Canvas'
import { io } from "socket.io-client";
import './App.css'
import ChatRoom from './components/ChatRoom';
import RoomLobby from './components/RoomLobby';
import Playground from './components/Playground';
import { Router, Routes, Route } from 'react-router-dom';
import { useRoom } from './context/RoomContext';

function App() {

  const { socket, roomCode, setRoomCode, username, setUsername } = useRoom();

  console.log("Current room code in App.jsx:", roomCode);

  return (
      <Routes>
        <Route path="/" element={<RoomLobby socket={socket} roomCode={roomCode} setRoomCode={setRoomCode} username={username} setUsername={setUsername} />} />
        <Route path={`/game`} element={
          <Playground socket={socket} roomCode={roomCode} username={username}/>
        } />
      </Routes>

  );

}

export default App
