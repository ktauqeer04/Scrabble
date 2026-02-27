import React, { useState, useEffect } from 'react';

const ChatRoom = ({socket}) => {

    const [message, setMessage] = useState("");
    const [chatMessages, setChatMessages] = useState([]);

    

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        socket.emit("chatMessage", message);
        setMessage(""); // ✅ clear input
    };



    useEffect(() => {
        socket.on("chatMessage", (message) => {
            try {
                setChatMessages((prev) => [...prev, message])                
            } catch (error) {
                throw new Error("Error updating chat messages: " + error.message);
            }

        }) 
        return () => socket.off("chatMessage");
    },[])

    return (
        <div>
            <form action="text">
                <input type="text" className="border" onChange={(e) => setMessage(e.target.value)}/>
                <br />
                <button type="submit" className="border" onClick={handleSubmit}>Send</button>
            </form>
            <div>
                {chatMessages.map((msg, key) => <li key={key}>{msg}</li>)}
            </div>
        </div>
    )
}

export default ChatRoom