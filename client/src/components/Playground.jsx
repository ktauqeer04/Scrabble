import Canvas from './Canvas';
import ChatRoom from './ChatRoom';
import { useEffect, useState } from 'react'

function Playground({ socket, roomCode, username }) {

    useEffect(() => {
        socket.on('game-snapshot', (data) => {
            console.log('data from game snapshot', data)
        })

        return () => socket.off('game-snapshot')
    })

    return (
        <div className="flex h-screen">
            <div className="flex-1 min-w-0 border border-gray-300">
                <Canvas socket={socket} roomCode={roomCode} username={username}/>
            </div>
            <div className="flex-1 min-w-0 border border-gray-500 flex flex-col h-screen">
                <div className='h-16 flex items-center justify-center border border-gray-400 shrink-0'>
                    Invite your friends using Room Code: {roomCode}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    <ChatRoom socket={socket} roomCode={roomCode} username={username}/>
                    <div className="h-8" />
                </div>
            </div>
        </div>
    )
}

export default Playground