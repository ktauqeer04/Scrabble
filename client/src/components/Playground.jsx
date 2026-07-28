import Canvas from './Canvas';
import ChatRoom from './ChatRoom';
import { useEffect, useState } from 'react'

function Playground({ socket, roomCode, username }) {
    const [players, setPlayers] = useState([]);
    const [snapshot, setSnapshot] = useState({});
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [drawTimer, setDrawTimer] = useState(60);
    const [maxRounds, setMaxRounds] = useState(3);
    const [gameMode, setGameMode] = useState('medium'); // 'easy' | 'medium' | 'hard'
    const [maxNoOfPlayersMessage, setMaxNoOfPlayersMessage] = useState("");

    const playerNames = Object.keys(snapshot.scoreBoards ?? {});

    useEffect(() => {
        const handleSnapshot = (data) => {
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


    useEffect(() => {
        socket.on("Cannot decrease player count", (message) => {
            setMaxNoOfPlayersMessage(message || "Cannot decrease below current player count");
        });
        return () => socket.off("Cannot decrease player count");
    }, [socket]);


    const handleStartGame = () => {
        socket.emit('Start-Game', { room: roomCode });

        return () => socket.off('Start-Game');
    }

    const handleGameSettings = () => {
        socket.emit('Game-Settings', {
            room: roomCode,
            maxNoOfPlayers: maxPlayers,
            drawTimer: drawTimer * 1000,
            maxRounds: maxRounds,
            gameMode: gameMode
        });
    };



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
                            {playerNames.map((name) => (
                                <li
                                    key={name}
                                    className="text-sm text-center py-1 border-b border-gray-100 flex justify-between px-2"
                                >
                                    <span>{name}</span>
                                    <span className="font-medium">{snapshot.scoreBoards[name] ?? 0}</span>
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

                        {username === snapshot?.players[0] && (
                            <>
                                {/* Max Players */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-gray-600">Max Players</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                const currentPlayerCount = snapshot?.players?.length || 2;
                                                setMaxPlayers(p => Math.max(currentPlayerCount, p - 1)); // ← can't go below current players
                                            }}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center">{maxPlayers}</span>
                                        <button
                                            onClick={() => setMaxPlayers(p => Math.min(8, p + 1))}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Draw Timer */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-gray-600">Draw Timer (s)</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setDrawTimer(t => Math.max(30, t - 10))}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                                        >
                                            −
                                        </button>
                                        <span className="w-8 text-center">{drawTimer}</span>
                                        <button
                                            onClick={() => setDrawTimer(t => Math.min(120, t + 10))}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Max Rounds */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-gray-600">Rounds</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setMaxRounds(r => Math.max(1, r - 1))}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center">{maxRounds}</span>
                                        <button
                                            onClick={() => setMaxRounds(r => Math.min(10, r + 1))}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Game Mode stays the same */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-600">Difficulty</label>
                                    <div className="flex gap-2">
                                        {['EASY', 'MEDIUM', 'HARD'].map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() => setGameMode(mode)}
                                                className={`flex-1 py-2 rounded-lg capitalize ${
                                                    gameMode === mode
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleGameSettings}
                                    className="bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600"
                                >
                                    Save Settings
                                </button>

                                <button
                                    onClick={handleStartGame}
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