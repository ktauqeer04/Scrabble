import { useState, useEffect, useRef } from 'react';

const ChatRoom = ({socket, roomCode, username}) => {

    const [message, setMessage] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const messagesEndRef = useRef(null);

    

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        console.log("chatMessage event provoked");
        socket.emit("chatMessage", { room: roomCode, message: message, username: username });
        console.log("chatMessage event emitted");
        setMessage(""); 
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);


    useEffect(() => {
        socket.on("receiveChatMessage", (message) => {

            console.log("receiveChatMessage on the first is", message);
            try {
                setChatMessages((prev) => [...prev, {text: message, type: 'normal'}])                
            } catch (error) {
                throw new Error("Error updating chat messages: " + error.message);
            }
            console.log("receiveChatMessage socket", message)
        }) 
        return () => socket.off("receiveChatMessage");
    },[])

    useEffect(() => {
        socket.on("closeCorrectAnswer", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message, type: 'close' }])                
            } catch (error) {
                throw new Error("Error updating chat messages: " + error.message);
            }
            console.log("closeCorrectAnswer socket", message);
        })
        return () => socket.off("closeCorrectAnswer");
    }, [])

    return (
        <div className="flex flex-col w-full max-w-md h-96 border rounded-lg shadow-sm overflow-hidden bg-white">
            {/* Messages area - grows and scrolls */}
            <ul className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {chatMessages.map((msg, key) => (
                    <li
                        key={key}
                        className="px-2 py-1 rounded break-words"
                        style={{ backgroundColor: msg.type === 'close' ? 'yellow' : 'transparent' }}
                    >
                        {msg.text}
                    </li>
                ))}
                <div ref={messagesEndRef} />
            </ul>

            {/* Input bar - pinned to bottom */}
            <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 border-t px-2 py-2 shrink-0"
            >
                <input
                    type="text"
                    className="flex-1 border px-2 py-1 rounded"
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button
                    type="submit"
                    className="border px-4 py-1 rounded text-black"
                >
                    Send
                </button>
            </form>
        </div>
    )
}

export default ChatRoom