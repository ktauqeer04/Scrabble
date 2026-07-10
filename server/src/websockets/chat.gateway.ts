import { ConnectedSocket, MessageBody, SubscribeMessage,OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import Game, { GameState } from "src/game.model";

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private rooms: Map<string, Game> = new Map();
    private userSockets: Map<string, string> = new Map();
    //let rooms: 

    handleDisconnect(client: Socket) {
        this.userSockets.forEach((socketId, username) => {
            if(socketId === client.id){
                this.userSockets.delete(username);
            }
        })
    }

    handleConnection(client: Socket, ...args: any[]) {
    }

    @SubscribeMessage('draw')
    handleEvent1(

        @MessageBody() data: { room: string, payload: any, username: string},
        @ConnectedSocket() client: Socket,

    ): any {

        const game = this.rooms.get(data.room);

        if(game?.gameState != GameState.PLAYER_GUESSING) return;

        if(data.username != game.drawer) return;

        // console.log(typeof(data.payload));

        game.canvasSnapshot.push(data.payload);

        client.to(data.room).emit('updateDrawing', data.payload)

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())

    }

    @SubscribeMessage('chatMessage')
    handleEvent2(
        @MessageBody() data: { room: string, message: string, username: string},
        @ConnectedSocket() client: Socket,
    ){
        const game = this.rooms.get(data.room);

        if(game?.gameState == GameState.WAITING) return;

        if(game?.gameState == GameState.PLAYER_GUESSING){

            // what the fuck am I doing here?????
            // okay I got it
            // the guessors who have already guessed the word will now send chats to only those who have guessed
            // and the drawer
            // check condition to get the correct guessors

            if(game.drawer == data.username){
                return;
            }

            if(game.correctGuesses.get(data.username) == true){
                
                const guessedUsersSocketIds = new Array();

                guessedUsersSocketIds.push(this.userSockets.get(game.drawer));

                for (const [name, guess] of game.correctGuesses){
                    if(guess){
                        guessedUsersSocketIds.push(this.userSockets.get(name));
                    }
                }


                this.server.to(guessedUsersSocketIds).emit('receiveCorrectChatMessage', data.message);
                return;
            }

            game.checkGuess(data.message, data.username, 
                () => {
                    data.message = `${data.username} has guessed the word`;
                    this.server.to(data.room).emit('correctAnswer', `${data.username} has guessed the word`)
                    
                },
                () => {
                    const closeAnswer = data.message + " is almost close"
                    this.server.to(client.id).emit("closeCorrectAnswer", closeAnswer);
                }
            );

            if(game?.checkIfAllHasGuessed()){
                this.server.to(data.room).emit('receiveRoundOverMessage', `Round Over, the word was ${game.currentWord}`);
            }

            return;

        }

        console.log("last event emitting")

        client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('receiveChatMessage', { message: data.message, username: data.username })
    }

    @SubscribeMessage('clearCanvas')
    handleEvent3(
        @MessageBody() data: { room: string, username: string },
        @ConnectedSocket() client: Socket,
    ){
        const game = this.rooms.get(data.room);
        if(game?.gameState != GameState.PLAYER_GUESSING) return;

        if(data.username != game.drawer) return;
        client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('updateCanvas')
    }


    // user that creates this room is the first person to join the room 
    @SubscribeMessage('createRoom')
    handleEvent4(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){
        client.join(data.room);
        this.userSockets.set(data.username, client.id);
        // this.server.to(data.room).emit()

        const game = new Game();
        this.rooms.set(data.room, game);
        game.startGame();
        game.addPlayer(data.username);

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
    }

    // user joining the room are second onwards
    @SubscribeMessage('joinRoom')
    handleEvent5(@MessageBody() data: any, @ConnectedSocket() client: Socket) {

        if (!this.rooms.has(data.room)) {
            client.emit('roomNotExists', { message: 'Room does not exist', flag: false });
            return;
        }

        const game = this.rooms.get(data.room);


        const addplayer = game?.addPlayer(data.username);


        if (addplayer?.success == false) {
            client.emit('cannot-join-game', addplayer.message); // emit to client, not room
            return;
        }

        this.userSockets.set(data.username, client.id);

        client.join(data.room); 

        client.emit('joinedRoom', { message: 'Joined Room Successfully', flag: true });

        if(game?.gameState == GameState.PLAYER_GUESSING){
            console.log(game.canvasSnapshot);
            client.emit("replayDrawing", game.canvasSnapshot);
        }

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); 

    }


    @SubscribeMessage('Start-Game')
    handleEventStartGame(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){

        const game = this.rooms.get(data.room);

        game?.roundStart(() => {

            game.startGuessingPhase(() => {

                game.showHiddenWord(() => {

                    game.nextTurn(
                    () => {
                        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()) // function parameters 
                    },
                    () => {
                        game.roundEnd();
                        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); // function parameters
                    },
                    () => {
                        this.server.to(data.room).emit('receiveRoundOverMessage', `Round Over, the word was ${game.currentWord}`);
                    },
                    () => {
                        this.server.to(data.room).emit('receiveDrawingMessage', `${game?.drawer} is drawing`)
                    }
                )

                    this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
                })

                game.markPlayerScores();

                this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()) // third emit player choosing after 25 seconds of guessing 
            },
            () => {
                this.server.to(data.room).emit('receiveRoundOverMessage', `Round Over, the word was ${game.currentWord}`);
            } 
            )
            
            this.server.to(data.room).emit('receiveDrawingMessage', `${game?.drawer} is drawing`)
            this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()) // second emit player guessing after 20 seconds of choosing

        });

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); // first emit player choosing immediately

    }


    @SubscribeMessage('refreshPage')
    handleEvent6(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ){

        client.join(data.room)

        const game = this.rooms.get(data.room);
        this.userSockets.set(data.username, client.id);
        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
        console.log(game?.players);
        console.log(client.id);

    }


    @SubscribeMessage('chosen-word')
    handleEvent7(
        @MessageBody() data: {room : string, chosenWord: string},
        @ConnectedSocket() client: Socket
    ) {

        const game = this.rooms.get(data.room);

        if(game?.gameState != GameState.PLAYER_CHOOSING){
            client.disconnect(true);
            return;
        }

        if(!game?.guessWords.includes(data.chosenWord)){
            client.disconnect(true);
            return;
        }

        game?.wordSelected(data.chosenWord);
        game?.completeChooseAction?.();

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
    }

    @SubscribeMessage('playerLeft')
    handleEvent8(
        @MessageBody() data: {room : string, socketId: string},
        @ConnectedSocket() client: Socket
    ) {

        const game = this.rooms.get(data.room);
        console.log(client.id)
        // const playerName = 
        // const index = game?.players.indexOf(data.)
       
        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
    }


    // server
    @SubscribeMessage('requestReplay')
    handleRequestReplay(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const game = this.rooms.get(data.room);
        if (game?.gameState === GameState.PLAYER_GUESSING) {
            client.emit("replayDrawing", game.canvasSnapshot);
        }
    }

}