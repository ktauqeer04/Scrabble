

function Playground({ socket, roomCode }) {
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