// src/context/RoomContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const RoomContext = createContext();
const socket = io("http://localhost:3000", {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  autoConnect: true
})

export function RoomProvider({ children }) {
  const [roomCode, setRoomCodeState] = useState(() => {
    return sessionStorage.getItem("roomCode") || "";
  });

  const [username, setUsernameState ] = useState(() => {
    return sessionStorage.getItem("username") || ""
  })

  const setRoomCode = (code) => {
      sessionStorage.setItem("roomCode", code);
      setRoomCodeState(code);
  };

  const setUsername = (name) => {
    sessionStorage.setItem("username", name);
    setUsernameState(name);
  }


  console.log("Current room code in RoomProvider after refresh:", roomCode);

  useEffect(() => {
    if(!roomCode || !username) return;

    socket.on('connect', () => {
      socket.emit("refreshPage", { room: roomCode, username: username });
    })

    return () => {return () => socket.off('connect', handleConnect)};

  }, [roomCode])

  return (
    <RoomContext.Provider value={{ socket, roomCode, setRoomCode, username, setUsername }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used inside a RoomProvider");
  }
  return context;
}