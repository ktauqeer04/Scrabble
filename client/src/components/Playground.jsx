import Canvas from './Canvas';
import ChatRoom from './ChatRoom';
import { useEffect, useState } from 'react'

function Playground({ socket, roomCode, username }) {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        socket.on('game-snapshot', (data) => {
            console.log('data from game snapshot', data)
            // Adjust this based on the actual shape of `data`
            setPlayers(data.players || [])
        })

        return () => socket.off('game-snapshot')
    }, [socket])


    useEffect(() => {
        socket.on('game-snapshot', (data) => {
            setPlayers(data.players || [])
        })

        // Ask for current state as soon as we're ready to listen
        socket.emit('requestSnapshot', { room: roomCode })

        return () => socket.off('game-snapshot')
    }, [socket, roomCode])

    return (
        <div className="flex h-screen">
            <div className="flex-1 min-w-0 border border-gray-300">
                <Canvas socket={socket} roomCode={roomCode} username={username}/>
            </div>

            <div className="flex-1 min-w-0 border border-gray-500 flex flex-col h-screen">
                <div className='h-16 flex items-center justify-center border border-gray-400 shrink-0'>
                    Invite your friends using Room Code: {roomCode}
                </div>

                <div className="flex-1 flex min-h-0">
                    <div className="flex-1 min-w-0 border border-gray-300 flex flex-col items-center justify-center p-3">
                        <h3 className="font-semibold mb-2">Players</h3>
                        <ul className="space-y-1 w-full overflow-y-auto">
                            {players.map((player, idx) => (
                                <li key={player.id ?? idx} className="text-sm text-center py-1 border-b border-gray-100">
                                    {player.name ?? player.username ?? player}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex-1 min-w-0 border border-gray-300 flex flex-col items-center justify-center">
                        <ChatRoom socket={socket} roomCode={roomCode} username={username}/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Playground