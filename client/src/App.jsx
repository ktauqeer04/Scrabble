import { useState, useMemo} from 'react'
import Canvas from './components/Canvas'
import { io } from "socket.io-client";
import './App.css'

function App() {

  const socket = useMemo(() => io("http://localhost:3000"), []);

  return (
    <>
    <div>
      <Canvas socket={socket}/>
    </div>
    <div>

    </div>

    </>
  )
}

export default App
