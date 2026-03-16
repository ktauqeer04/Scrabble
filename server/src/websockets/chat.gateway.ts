import { ConnectedSocket, MessageBody, SubscribeMessage,OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import Game from "src/game.model";

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms: Map<string, Game> = new Map();
    private userSockets: Map<string, string> = new Map();
    //let rooms: 

    handleDisconnect(client: Socket) {
        console.log('Client disconnect in handle Disconnection:', client.id);
        this.userSockets.forEach((socketId, username) => {
            if(socketId === client.id){
                console.log(username, socketId);
                this.userSockets.delete(username);
            }
        })
    }

    handleConnection(client: Socket, ...args: any[]) {
        console.log('client Connected in handle connection', client.id);
        // console.log(`total number of client is in rooms:`, Object.keys(client.connected).length);
    }

    @SubscribeMessage('draw')
    handleEvent1(

        @MessageBody() data: { room: string, payload: any},
        @ConnectedSocket() client: Socket,

    ): any {

        const game = this.rooms.get(data.room);
        console.log('Draw Event: game from room', typeof game);
        // console.log('draw Event: Received drawing data:', data);
        client.to(data.room).emit('updateDrawing', data.payload)
        console.log(data.room);
        console.log(game);

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())

    }

    @SubscribeMessage('chatMessage')
    handleEvent2(
        @MessageBody() data: { room: string, message: string},
        @ConnectedSocket() client: Socket,
    ){
        // console.log('chatMessage Event: Received chat message:', data);
        const game = this.rooms.get(data.room);
        client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('receiveChatMessage', data.message)
        // console.log('chatMessage Event: total number of client in rooms', this.server.sockets.adapter.rooms.get(data.room))
    }

    @SubscribeMessage('clearCanvas')
    handleEvent3(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ){
        const game = this.rooms.get(data.room)
        client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('updateCanvas')
    }


    // user that creates this room is the first person to join the room 
    @SubscribeMessage('createRoom')
    handleEvent4(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){
        console.log('createRoom Event: Received room message:', data);
        client.join(data.room);
        this.userSockets.set(data.username, client.id);
        // this.server.to(data.room).emit()
        console.log('createRoom fired', client.id) 

        const game = new Game();
        this.rooms.set(data.room, game);
        game.startGame();
        game.addPlayer(data.username);

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
        // console.log('createRoom Event: client joined', client.id)
        // console.log(`createRoom Event: Client ${client.id} is in rooms:`, client.rooms);
        // console.log('createRoom Event: total number of client in rooms', this.server.sockets.adapter.rooms.get(data.room))
    }

    // user joining the room are second onwards
    @SubscribeMessage('joinRoom')
    handleEvent5(@MessageBody() data: any, @ConnectedSocket() client: Socket) {

        if (!this.rooms.has(data.room)) {
            client.emit('roomNotExists', { message: 'Room does not exist', flag: false });
            return;
        }

        const game = this.rooms.get(data.room);
        const addplayer = game?.addPlayer(data.username, (() => {

            this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
        }));

        if (addplayer?.success == false) {
            console.log('triggers in if');
            client.emit('cannot-join-game', addplayer.message); // emit to client, not room
            return;
        }

        this.userSockets.set(data.username, client.id);

        // console.log('triggers after if')

        client.join(data.room); 

        client.emit('joinedRoom', { message: 'Joined Room Successfully', flag: true });

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); 

        

    }


    @SubscribeMessage('refreshPage')
    handleEvent6(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){

        console.log('refreshPage Event: Data', data);
        client.join(data.room)

        const game = this.rooms.get(data.room);
        this.userSockets.set(data.username, client.id);
        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())

        console.log('refreshPage Event: Page refreshed in room', data.room)
    }


    @SubscribeMessage('chosen-word')
    handleEvent7(
        @MessageBody() data: {room : string, chosenWord: string},
        @ConnectedSocket() client: Socket
    ) {
        console.log('Chosen Word Event: chosen word is', data.chosenWord);
        const game = this.rooms.get(data.room);
        game?.wordSelected(data.chosenWord);
        game?.completeAction?.();

        this.server.to(data.room).emit('game-snapeshot', game?.getSnapshot());
    }

}