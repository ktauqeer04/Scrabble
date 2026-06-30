import { useState, useEffect } from 'react';

const ChatRoom = ({socket, roomCode, username}) => {

    const [message, setMessage] = useState("");
    const [chatMessages, setChatMessages] = useState([]);

    

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        console.log("chatMessage event provoked");
        socket.emit("chatMessage", { room: roomCode, message: message, username: username });
        console.log("chatMessage event emitted");
        setMessage(""); 
    };



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
        <div>
            <form action="text">
                <input type="text" className="border" onChange={(e) => setMessage(e.target.value)}/>
                <br />
                <button type="submit" className="border" onClick={handleSubmit}>Send</button>
            </form>
            <div>
                {chatMessages.map((msg, key) => 
                    <li key={key} style={{ backgroundColor: msg.type === 'close' ? 'yellow' : 'transparent'}}>{msg.text}</li>
                )}
            </div>
        </div>
    )
}

export default ChatRoom