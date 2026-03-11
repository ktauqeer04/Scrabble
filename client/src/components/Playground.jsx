import Canvas from './Canvas';
import ChatRoom from './ChatRoom';
import { useEffect, useState } from 'react'

function Playground({ socket, roomCode }) {

    useEffect(() => {
        socket.on('game-snapshot', (data) => {
            console.log('data from game snapshot', data)
        })

        return () => socket.off('game-snapshot')
    })

  return (
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
  )
}

export default Playground