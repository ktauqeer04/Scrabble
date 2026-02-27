// src/context/RoomContext.js
import { createContext, useContext, useState } from 'react';

const RoomContext = createContext();

export function RoomProvider({ children }) {
  const [roomCode, setRoomCode] = useState("");

  return (
    <RoomContext.Provider value={{ roomCode, setRoomCode }}>
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