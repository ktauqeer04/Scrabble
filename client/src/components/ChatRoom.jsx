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
        socket.on("playerLeft", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message, type: 'normal' }])                
            } catch (error) {
                throw new Error("Error updating playerLeft messages: " + error.message);
            }
            console.log("playerLeft socket", message);
        })
        return () => socket.off("playerLeft");
    }, [])

    useEffect(() => {
        socket.on("joinRoom", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message, type: 'normal' }])                
            } catch (error) {
                throw new Error("Error updating joinRoom messages: " + error.message);
            }
            console.log("joinRoom socket", message);
        })
        return () => socket.off("joinRoom");
    }, [])

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

    useEffect(() => {
        socket.on("gameWinner", (message) => {
            try {
                setChatMessages((prev) => [...prev, { text: message, type: 'winner' }]);
            } catch (error) {
                throw new Error("Error updating gameWinner messages: " + error.message);
            }
        })
        return () => socket.off("gameWinner")
    }, []) 

    return (
        <div className="flex flex-col w-full h-full bg-white rounded-2xl border-4 border-purple-600 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-b-4 border-purple-600 p-3 text-center">
                <h3 className="text-lg font-black text-purple-900 flex items-center justify-center gap-2">
                    <span className="text-xl">💬</span> Chat
                </h3>
            </div>

            {/* Messages area - grows and scrolls */}
            <ul className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {chatMessages.map((msg, key) => (
                    <li
                        key={key}
                        className={`px-3 py-2 rounded-xl break-words font-semibold text-sm border-3 shadow-md ${
                            msg.type === 'close' 
                                ? 'bg-gradient-to-br from-yellow-200 to-yellow-300 border-yellow-600 text-yellow-900' 
                                : msg.type === 'correctGuessers'
                                ? 'bg-gradient-to-br from-green-200 to-green-300 border-green-600 text-green-900'
                                : msg.type === 'winnerFplayer'
                                ? 'bg-gradient-to-br from-red-200 to-red-300 border-red-600 text-red-900'
                                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 text-gray-800'
                        }`}
                    >
                        {msg.text}
                    </li>
                ))}
                <div ref={messagesEndRef} />
            </ul>

            {/* Input bar - pinned to bottom */}
            <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 border-t-4 border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 px-3 py-3 shrink-0"
            >
                <input
                    type="text"
                    placeholder='Type your answer...'
                    value={message}
                    className="flex-1 border-3 border-purple-300 px-4 py-2 rounded-xl font-semibold text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 outline-none transition-all duration-200 shadow-md"
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black rounded-xl border-3 border-purple-700 shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                    Send
                </button>
            </form>
        </div>
    )
}

export default ChatRoom