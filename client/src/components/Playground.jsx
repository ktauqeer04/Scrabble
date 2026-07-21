import Canvas from './Canvas';
import ChatRoom from './ChatRoom';
import { useEffect, useState } from 'react'

function Playground({ socket, roomCode, username }) {
    const [players, setPlayers] = useState([]);
    const [snapshot, setSnapshot] = useState({});

    useEffect(() => {
        const handleSnapshot = (data) => {
            setPlayers(data.players || []);
            setSnapshot(data);
        };

        socket.on('game-snapshot', handleSnapshot);
        socket.emit('requestSnapshot', { room: roomCode });

        console.log("username is ", username);
        console.log("snapshot username is ", snapshot);

        return () => socket.off('game-snapshot', handleSnapshot);
    }, [socket, roomCode]); 

    useEffect(() => {
        console.log('snapshot updated', snapshot);
    }, [snapshot]);

    return (
        <div className="flex h-screen relative"> {/* ← add relative */}
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

            {snapshot?.gamestate === 'waiting' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 w-96 flex flex-col gap-4">
                        
                        <h2 className="text-2xl font-bold text-center">Game Lobby</h2>

                        {/* room code */}
                        <div className="flex items-center gap-2 bg-gray-100 p-3 rounded">
                            <span className="font-mono text-lg">{roomCode}</span>
                            <button
                                onClick={() => navigator.clipboard.writeText(roomCode)}
                                className="ml-auto text-sm text-blue-500"
                            >
                                Copy
                            </button>
                        </div>

                        {/* players joined */}
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Players joined:</p>
                            {snapshot?.players.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 py-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"/>
                                    <span>{p}</span>
                                </div>
                            ))}
                        </div>

                        {/* only room creator sees settings and start button */}
                        {username === snapshot?.players[0] && (
                            <>
                                {/* <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-600">Guess Duration (seconds)</label>
                                    <input
                                        type="range"
                                        min="30"
                                        max="120"
                                        defaultValue="60"
                                        className="w-full"
                                        onChange={(e) => setGuessDuration(e.target.value)}
                                    />
                                    <span className="text-sm text-center">{guessDuration}s</span>
                                </div> */}

                                <button
                                    // onClick={handleStartGame}
                                    className="bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600"
                                >
                                    Start Game!
                                </button>
                            </>
                        )}

                        {/* non-creators see waiting message */}
                        {username !== snapshot?.players[0] && (
                            <p className="text-center text-gray-500">
                                Waiting for host to start the game...
                            </p>
                        )}

                    </div>
                </div>
            )}
            
        </div>
    )
}

export default Playground