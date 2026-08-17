import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import Canvas from './Canvas';
import ChatRoom from './ChatRoom';
import { useEffect, useState } from 'react'

function Playground({ socket, username }) {
    const navigate = useNavigate(); // ← move to the top
    const { roomCode } = useRoom(); 
    const [players, setPlayers] = useState([]);
    const [snapshot, setSnapshot] = useState({});
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [drawTimer, setDrawTimer] = useState(60);
    const [maxRounds, setMaxRounds] = useState(3);
    const [gameMode, setGameMode] = useState('medium'); // 'easy' | 'medium' | 'hard'
    const [maxNoOfPlayersMessage, setMaxNoOfPlayersMessage] = useState("");
    const [cannotStartGameError, setCannotStartGameError] = useState("");

    const playerNames = Object.keys(snapshot.scoreBoards ?? {});

    useEffect(() => {
        if (!roomCode) {
            navigate('/');
        }
    }, []);

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


    useEffect(() => {
        socket.on("cannot-start-game", (message) => {
            setCannotStartGameError(message || "Cannot start game with only 1 player");
            setTimeout(() => setCannotStartGameError(""), 3000);
        });
        return () => socket.off("cannot-start-game");
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
        <div className="flex h-screen relative bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-300">
            {/* Left: Canvas */}
            <div className="flex-1 min-w-0 m-4 rounded-3xl overflow-hidden border-4 border-purple-600 shadow-2xl bg-white">
                <Canvas socket={socket} roomCode={roomCode} username={username} snapshot={snapshot}/>
            </div>

            {/* Right: Game Info + Players + Chat */}
            <div className="flex-1 min-w-0 m-4 flex flex-col gap-4">
                {/* Word Underscores Panel - TODO: Add hints, timer, and other game info here */}
                <div className="bg-white rounded-2xl border-4 border-purple-600 shadow-xl p-4">
                    <div className="flex items-center justify-between">
                        {/* Rounds Display - Left Side */}
                        <div className="flex-shrink-0">
                            <span className="text-lg font-bold text-purple-600">
                                Round {snapshot?.round || 1}/{snapshot?.maxRounds || 3}
                            </span>
                        </div>

                        {/* Word Underscores - Center-Right */}
                        <div className="flex flex-col items-center justify-center gap-1 flex-1">
                            {snapshot?.gamestate === 'player_guessing' && snapshot?.currentWord ? (
                                <>
                                    <span className="text-xs font-bold text-gray-500 uppercase">
                                        {snapshot?.chooser?.drawer === username ? 'Your Word' : 'Guess This'}
                                    </span>
                                    <div className="flex items-center justify-center gap-2">
                                        {snapshot?.chooser?.drawer === username ? (
                                            // Show the actual word for the drawer
                                            <span className="text-3xl font-black text-purple-900">
                                                {snapshot.currentWord}
                                            </span>
                                        ) : (
                                            // Show underscores for guessers
                                            Array.from(snapshot.currentWord).map((char, index) => (
                                                <span
                                                    key={index}
                                                    className={`text-3xl font-black text-purple-900 px-1 pb-1 ${
                                                        char === ' ' ? '' : 'border-b-4 border-purple-600'
                                                    }`}
                                                >
                                                    {'\u00A0'}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <span className="text-lg font-bold text-gray-400">Waiting</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Players & Chat Container */}
                <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                    {/* Players Panel */}
                    <div className="flex-1 bg-white rounded-2xl border-4 border-purple-600 shadow-xl p-4 flex flex-col min-h-0">
                        <h3 className="text-xl font-black text-purple-900 mb-3 text-center flex items-center justify-center gap-2">
                            <span className="text-2xl">👥</span> Players
                        </h3>
                        <ul className="space-y-2 overflow-y-auto flex-1">
                            {playerNames.map((name) => (
                                <li
                                    key={name}
                                    className="flex justify-between items-center bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl border-3 border-yellow-600 px-4 py-3 shadow-md transform hover:scale-105 transition-all duration-200"
                                >
                                    <span className="font-bold text-gray-800">{name}</span>
                                    <span className="px-3 py-1 bg-purple-600 text-white font-black rounded-lg text-sm">{snapshot.scoreBoards[name] ?? 0}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Chat Panel */}
                    <div className="flex-1 min-h-0">
                        <ChatRoom socket={socket} roomCode={roomCode} username={username}/>
                    </div>
                </div>

                {/* Room Code Section */}
                <div className="bg-white rounded-2xl border-4 border-purple-600 shadow-xl p-3 text-center">
                    <p className="text-xs font-bold text-purple-600 mb-2">Invite your friends!</p>
                    <div className="flex items-center justify-center gap-3 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl border-3 border-yellow-600 px-3 py-2">
                        <span className="text-xl font-black text-purple-900 tracking-wider">{roomCode}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(roomCode);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black text-xs rounded-xl border-3 border-blue-700 shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            </div>

            {/* Lobby Overlay */}
            {snapshot?.gamestate === 'waiting' && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/80 to-yellow-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border-8 border-purple-600 shadow-2xl p-8 w-full max-w-lg flex flex-col gap-5 transform hover:scale-[1.02] transition-transform duration-300">
                        
                        {/* Title */}
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-purple-900 mb-2">Game Lobby</h2>
                            <p className="text-gray-600 font-bold">Waiting for players to join...</p>
                        </div>

                        {/* Room Code Display */}
                        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl border-4 border-yellow-600 p-4 shadow-lg">
                            <p className="text-sm font-bold text-gray-700 mb-2 text-center">Room Code</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl font-black text-purple-900 tracking-widest">{roomCode}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(roomCode)}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black text-sm rounded-xl border-3 border-blue-700 shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* Players Joined */}
                        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl border-4 border-green-600 p-4 shadow-lg">
                            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="text-xl">👥</span> Players joined:
                            </p>
                            <div className="space-y-2">
                                {snapshot?.players.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 border-2 border-green-500">
                                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"/>
                                        <span className="font-bold text-gray-800">{p}</span>
                                        {i === 0 && <span className="ml-auto text-xs font-black text-purple-600 bg-purple-100 px-2 py-1 rounded-lg">HOST</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {username === snapshot?.players[0] && (
                            <>
                                {/* Settings Card */}
                                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl border-4 border-purple-600 p-5 shadow-lg space-y-4">
                                    <h3 className="text-lg font-black text-purple-900 text-center mb-3">Game Settings</h3>

                                    {/* Max Players */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-700">Max Players</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const currentPlayerCount = snapshot?.players?.length || 2;
                                                    setMaxPlayers(p => Math.max(currentPlayerCount, p - 1));
                                                }}
                                                className="w-10 h-10 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-yellow-600 font-black text-xl shadow-md transform hover:scale-110 active:scale-95 transition-all duration-200"
                                            >
                                                −
                                            </button>
                                            <span className="w-8 text-center font-black text-2xl text-purple-900">{maxPlayers}</span>
                                            <button
                                                onClick={() => setMaxPlayers(p => Math.min(8, p + 1))}
                                                className="w-10 h-10 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-yellow-600 font-black text-xl shadow-md transform hover:scale-110 active:scale-95 transition-all duration-200"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Draw Timer */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-700">Draw Timer (s)</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setDrawTimer(t => Math.max(30, t - 10))}
                                                className="w-10 h-10 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-yellow-600 font-black text-xl shadow-md transform hover:scale-110 active:scale-95 transition-all duration-200"
                                            >
                                                −
                                            </button>
                                            <span className="w-12 text-center font-black text-2xl text-purple-900">{drawTimer}</span>
                                            <button
                                                onClick={() => setDrawTimer(t => Math.min(120, t + 10))}
                                                className="w-10 h-10 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-yellow-600 font-black text-xl shadow-md transform hover:scale-110 active:scale-95 transition-all duration-200"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Max Rounds */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-700">Rounds</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setMaxRounds(r => Math.max(1, r - 1))}
                                                className="w-10 h-10 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-yellow-600 font-black text-xl shadow-md transform hover:scale-110 active:scale-95 transition-all duration-200"
                                            >
                                                −
                                            </button>
                                            <span className="w-8 text-center font-black text-2xl text-purple-900">{maxRounds}</span>
                                            <button
                                                onClick={() => setMaxRounds(r => Math.min(10, r + 1))}
                                                className="w-10 h-10 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-yellow-600 font-black text-xl shadow-md transform hover:scale-110 active:scale-95 transition-all duration-200"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-gray-700">Difficulty</label>
                                        <div className="flex gap-2">
                                            {['EASY', 'MEDIUM', 'HARD'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setGameMode(mode)}
                                                    className={`flex-1 py-3 rounded-xl font-black text-sm border-3 shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 ${
                                                        gameMode === mode
                                                            ? 'bg-gradient-to-r from-green-400 to-green-500 text-white border-green-700'
                                                            : 'bg-white text-gray-600 border-gray-400 hover:border-purple-400'
                                                    }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <button
                                    onClick={handleGameSettings}
                                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black text-lg rounded-2xl border-4 border-blue-700 shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                                >
                                    Save Settings
                                </button>

                                {cannotStartGameError && (
                                    <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl border-4 border-red-500 p-4 text-center shadow-lg">
                                        <p className="text-sm font-bold text-red-700 flex items-center justify-center gap-2">
                                            <span className="text-xl">⚠️</span>
                                            {cannotStartGameError}
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleStartGame}
                                    className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black text-xl rounded-2xl border-4 border-green-800 shadow-xl transform hover:scale-105 hover:-rotate-1 active:scale-95 transition-all duration-200"
                                >
                                    Start Game!
                                </button>
                            </>
                        )}

                        {/* Non-host waiting message */}
                        {username !== snapshot?.players[0] && (
                            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl border-4 border-orange-400 p-6 text-center">
                                <p className="text-lg font-bold text-orange-800 flex items-center justify-center gap-2">
                                    <span className="text-2xl animate-pulse">⏳</span>
                                    Waiting for host to start the game...
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            )}
            
        </div>
    )
}

export default Playground