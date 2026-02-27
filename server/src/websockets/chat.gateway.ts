import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: true})
export class ChatGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('draw')
    handleEvent1(

        @MessageBody() data: { room: string, payload: any},
        @ConnectedSocket() client: Socket,

    ): any {

        console.log('Received drawing data:', data);
        client.to(data.room).emit('updateDrawing', data.payload)

        return true;

    }

    @SubscribeMessage('chatMessage')
    handleEvent2(
        @MessageBody() data: { room: string, message: string},
        @ConnectedSocket() client: Socket,
    ){
        console.log('Received chat message:', data);
        client.to(data.room).emit('receiveChatMessage', data.message)
    }

    @SubscribeMessage('clearCanvas')
    handleEvent3(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ){
        client.to(data.room).emit('updateCanvas')
    }


    @SubscribeMessage('createRoom')
    handleEvent4(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){
        console.log('Received room message:', data);
        client.join(data.room);
        // this.server.to(data.room).emit()
        console.log('client joinded', client.id)
        console.log(`Client ${client.id} is in rooms:`, client.rooms);
    }

}