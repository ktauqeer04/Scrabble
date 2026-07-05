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
        socket.on("receiveChatMessage", (data) => {

            console.log("receiveChatMessage on the first is", data);
            try {
                setChatMessages((prev) => [...prev, {text: data.username + " : " + data.message, type: 'normal'}])                
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
                throw new Error("Error updating closeCorrectAnswer messages: " + error.message);
            }
            console.log("closeCorrectAnswer socket", message);
        })
        return () => socket.off("closeCorrectAnswer");
    }, [])

    useEffect(() => {
        socket.on("receiveCorrectChatMessage", (message) => {
            try{
                setChatMessages((prev) => [...prev, { text: message, type: 'correctGuessers' }]);
            } catch (error) {
                throw new Error("Error updating receiveCorrectChatMessage messages: " + error.message);
            }
            console.log("receiveCorrectChatMessage socket", message);
        })
        return () => socket.off("receiveCorrectChatMessage")
    }, [])

    useEffect(() => {
        socket.on("receiveRoundOverMessage", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message }]);
            } catch (error) {
                throw new Error("Error updating receiveRoundOverMessage messages: " + error.message);
            }
        })
        return () => socket.off("receiveRoundOverMessage")
    }, []) 

     useEffect(() => {
        socket.on("receiveDrawingMessage", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message }]);
            } catch (error) {
                throw new Error("Error updating receiveDrawingMessage messages: " + error.message);
            }
        })
        return () => socket.off("receiveDrawingMessage")
    }, []) 

    useEffect(() => {
        socket.on("correctAnswer", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message }]);
            } catch (error) {
                throw new Error("Error updating correctAnswer messages: " + error.message);
            }
        })
        return () => socket.off("correctAnswer")
    }, []) 

    return (
        <div className="flex flex-col w-full max-w-md h-96 border border-gray-500 rounded-lg shadow-sm overflow-hidden bg-white">
            {/* Messages area - grows and scrolls */}
            <ul className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {chatMessages.map((msg, key) => (
                    <li
                        key={key}
                        className="px-2 py-1 rounded break-words border border-gray-300"
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
                    placeholder='type your answer'
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