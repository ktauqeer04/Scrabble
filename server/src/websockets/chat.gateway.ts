import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";

@WebSocketGateway({ cors: true})
export class ChatGateway {

    @SubscribeMessage('draw')
    handleEvent(

        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,

    ): any {

        console.log(data);
        client.broadcast.emit('draw', data);

        return true;

    }


}