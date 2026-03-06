import { ConnectedSocket, MessageBody, SubscribeMessage,OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import Game from "src/game.model";

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms: Map<string, Game> = new Map();

    //let rooms: 

    handleDisconnect(client: Socket) {
        // console.log('Client disconnected:', client.id);
    }

    handleConnection(client: Socket, ...args: any[]) {
        // console.log('client Connected', client.id);
        // console.log(`total number of client is in rooms:`, Object.keys(client.connected).length);
    }

    @SubscribeMessage('draw')
    handleEvent1(

        @MessageBody() data: { room: string, payload: any},
        @ConnectedSocket() client: Socket,

    ): any {

        // console.log('draw Event: Received drawing data:', data);
        client.to(data.room).emit('updateDrawing', data.payload)

        return true;

    }

    @SubscribeMessage('chatMessage')
    handleEvent2(
        @MessageBody() data: { room: string, message: string},
        @ConnectedSocket() client: Socket,
    ){
        // console.log('chatMessage Event: Received chat message:', data);
        client.to(data.room).emit('receiveChatMessage', data.message)
        // console.log('chatMessage Event: total number of client in rooms', this.server.sockets.adapter.rooms.get(data.room))
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
        // console.log('createRoom Event: Received room message:', data);
        client.join(data.room);
        // this.server.to(data.room).emit()
        console.log('createRoom fired', client.id) 

        const game = new Game();
        game.startGame(data.username);
        
        this.rooms.set(data.room, game);

        // console.log('createRoom Event: client joined', client.id)
        // console.log(`createRoom Event: Client ${client.id} is in rooms:`, client.rooms);
        // console.log('createRoom Event: total number of client in rooms', this.server.sockets.adapter.rooms.get(data.room))
    }


    @SubscribeMessage('joinRoom')
    handleEvent5(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){
        console.log('joinRoom Event: Joined Room', client.rooms);
        if(!this.rooms.has(data.room)){
            client.emit('roomNotExists', {
                message: 'Room does not exist',
                flag: true
            });
            return;
        }
        client.join(data.room)

        client.emit('joinedRoom', {
            message: 'Joined Room Successfully',
            flag: false
        })
        
        const game = this.rooms.get(data.room);

        game?.addPlayer(data.username);
        

        // let drawer =
        // if(game){
        //     game.addPlayer(client.id);
        //     game.roundStart(0);
        // }

    }


    @SubscribeMessage('refreshPage')
    handleEvent6(
        @MessageBody() data: { room: string, message: string},
        @ConnectedSocket() client: Socket,
    ){
        client.join(data.room)
        console.log('refreshPage Event: Page refreshed in room', data.room)
    }

}