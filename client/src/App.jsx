import { useState, useMemo} from 'react'
import Canvas from './components/Canvas'
import { io } from "socket.io-client";
import './App.css'
import ChatRoom from './components/ChatRoom';

function App() {

  const socket = useMemo(() => io("http://localhost:3000"), []);

  return (
  <div className="flex h-screen">
    {/* Left: Canvas – takes all remaining space */}
    <div className="flex-1 min-w-0">
      <Canvas socket={socket} />
    </div>

    {/* Right: Sidebar – fixed width */}
    <div className='flex-1 '>
      <ChatRoom socket={socket} />
    </div>
    
  </div>
);
}

export default App
