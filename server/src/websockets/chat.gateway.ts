import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: true})
export class ChatGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('draw')
    handleEvent1(

        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,

    ): any {

        client.broadcast.emit('draw', data);

        return true;

    }

    @SubscribeMessage('chatMessage')
    handleEvent2(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){
        console.log('Received chat message:', data);
        this.server.emit('chatMessage', data)
    }

}