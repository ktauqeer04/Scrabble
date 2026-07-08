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
    if (!roomCode || !username) return;

    const handleConnect = () => {
      socket.emit("refreshPage", { room: roomCode, username });
    };

    socket.on('connect', handleConnect);

    // socket might already be connected when this effect runs,
    // in which case 'connect' won't fire again
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [roomCode, username]);



  useEffect(() => {
    if (username) return;

    const timer = setTimeout(() => {
      const handleConnect = () => {
        socket.emit("playerLeft", { room: roomCode, socketId: socket.id });
      };

      if (socket.connected) {
        handleConnect();
      } else {
        socket.on('connect', handleConnect);
      }
    }, 2200); // 2 - 2.5s window

    return () => {
      clearTimeout(timer);
    };
  }, [username, roomCode]);


  
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