import { ConnectedSocket, MessageBody, SubscribeMessage,OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameMode, GameState } from "src/enums";
import Game from "src/game.model";

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private roomsWithGame: Map<string, Game> = new Map();
    private usernameWithClientId: Map<string, string> = new Map();
    private clientWithRoom: Map<string,string> = new Map();
    //let rooms: 

    // problem: handleDisconnect can only send clientId to the server, not the room
    handleDisconnect(client: Socket) {

        this.usernameWithClientId.forEach((socketId, username) => {

            if(socketId === client.id){

                const room = this.clientWithRoom.get(socketId) as string;
                const game = this.roomsWithGame.get(room) as Game;

                const newPlayersArray = game.players.filter(name => name != username);
                game.players = newPlayersArray;

                if(username == game.drawer){

                    if(game.gameState == GameState.PLAYER_CHOOSING){
                        // call next player as a drawer with the game state as game choosing
                        game.completeChooseAction?.();
                        game.completeGuessAction?.();
                        game.completeHiddenAction?.();
                        // game.gameState = GameState.PLAYER_CHOOSING;
                    }

                    if(game.gameState == GameState.PLAYER_GUESSING){
                        // finish the gameState of choosing and start hidden state
                        game.completeGuessAction?.();
                    }

                }

                console.log('players array length ', game.players.length);

                this.usernameWithClientId.delete(username);

                client.leave(room);

                if(game.players.length == 1){
                    console.log('game has officially ended');
                    // I need to end the game here, the game cannot be played with only 1 people in it. 
                    // but I need to break all the running tasks
                    game.gameState = GameState.ENDED;
                    game.endGame();
                }

                this.server.to(room).emit("playerLeft", `${username} has left the room`);
                this.server.to(room).emit('game-snapshot', game?.getSnapshot())

                if(game.players.length == 0){

                    game.endGame();

                    this.roomsWithGame.delete(room);

                    this.clientWithRoom.forEach((r, socketId) => {
                        if(r == room){
                            this.clientWithRoom.delete(socketId);
                        }
                    })

                    console.log(`${room}  game has ended`);

                }

            }

        })

    }

    handleConnection(client: Socket, ...args: any[]) {
    }

    @SubscribeMessage('draw')
    handleEventDraw(

        @MessageBody() data: { room: string, payload: any, username: string},
        @ConnectedSocket() client: Socket,

    ): any {

        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.PLAYER_GUESSING) return;

        if(data.username != game.drawer) return;

        // console.log(typeof(data.payload));

        game.canvasSnapshot.push(data.payload);

        client.to(data.room).emit('updateDrawing', data.payload)

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())

    }

    @SubscribeMessage('chatMessage')
    handleEventChatMessage(
        @MessageBody() data: { room: string, message: string, username: string},
        @ConnectedSocket() client: Socket,
    ){
        const game = this.roomsWithGame.get(data.room);

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

                guessedUsersSocketIds.push(this.usernameWithClientId.get(game.drawer));

                for (const [name, guess] of game.correctGuesses){
                    if(guess){
                        guessedUsersSocketIds.push(this.usernameWithClientId.get(name));
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
                    this.server.to(data.room).emit('receiveChatMessage', { message: data.message, username: data.username })
                }, 
                () => {
                    this.server.to(data.room).emit('receiveChatMessage', { message: data.message, username: data.username })
                }
            );

            if(game?.checkIfAllHasGuessed()){
                this.server.to(data.room).emit('receiveRoundOverMessage', `Round Over, the word was ${game.currentWord}`);
            }

            return;

        }

        console.log("last event ")

        client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('receiveChatMessage', { message: data.message, username: data.username })
    }

    @SubscribeMessage('clearCanvas')
    handleEventClearCanvas(
        @MessageBody() data: { room: string, username: string },
        @ConnectedSocket() client: Socket,
    ){
        const game = this.roomsWithGame.get(data.room);
        if(game?.gameState != GameState.PLAYER_GUESSING) return;

        if(data.username != game.drawer) return;
        client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('updateCanvas')
    }


    // user that creates this room is the first person to join the room 
    @SubscribeMessage('createRoom')
    handleEventCreateRoom(
        @MessageBody() data: {
            room: string,
            username: string
        },
        @ConnectedSocket() client: Socket,
    ){
        client.join(data.room);
        this.usernameWithClientId.set(data.username, client.id);
        this.clientWithRoom.set(client.id, data.room);
        // this.server.to(data.room).emit()

        const game = new Game();
        this.roomsWithGame.set(data.room, game);
        game.startGame();
        game.addPlayer(data.username);

        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
    }

    // user joining the room are second onwards
    @SubscribeMessage('joinRoom')
    handleEventJoinRoom(
        @MessageBody() data: {
            room: string, 
            username: string
        }, 
        @ConnectedSocket() client: Socket
    ) {

        if (!this.roomsWithGame.has(data.room)) {
            client.emit('roomNotExists', { message: 'Room does not exist', flag: false });
            return;
        }

        const game = this.roomsWithGame.get(data.room);


        const addplayer = game?.addPlayer(data.username);


        if (addplayer?.success == false) {
            client.emit('cannot-join-game', addplayer.message); // emit to client, not room
            return;
        }

        this.usernameWithClientId.set(data.username, client.id);
        this.clientWithRoom.set(client.id, data.room);

        client.join(data.room); 

        client.emit('joinedRoom', { message: 'Joined Room Successfully', flag: true });

        if(game?.gameState == GameState.PLAYER_GUESSING){
            // console.log(game.canvasSnapshot);
            client.emit("replayDrawing", game.canvasSnapshot);
        }

        this.server.to(data.room).emit("joinRoom", `${data.username} has join the room`);
        this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); 

    }


    @SubscribeMessage('Start-Game')
    handleEventStartGame(
        @MessageBody() data: {
            room: string,
            maxPlayers: number, 
            drawTime: number, 
            noOfRounds: number
        },
        @ConnectedSocket() client: Socket,
    ){

        const game = this.roomsWithGame.get(data.room) as Game;

        if(game.players.length == 1){
            client.emit('cannot-start-game', false);
            return;
        }

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
                        this.server.to(data.room).emit('receiveRoundOverMessage', 'Game has Ended');
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


    @SubscribeMessage('chosen-word')
    handleEventChosenWord(
        @MessageBody() data: {room : string, chosenWord: string},
        @ConnectedSocket() client: Socket
    ) {

        const game = this.roomsWithGame.get(data.room);

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
    handleEventPlayerLeft(
        @MessageBody() data: {room : string, socketId: string},
        @ConnectedSocket() client: Socket
    ) {

        const game = this.roomsWithGame.get(data.room);
        // console.log(client.id)
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
        const game = this.roomsWithGame.get(data.room);
        if (game?.gameState === GameState.PLAYER_GUESSING) {
            client.emit("replayDrawing", game.canvasSnapshot);
        }
    }


    @SubscribeMessage('requestSnapshot')
    handleRequestSnapshot(
        @MessageBody() data: any, 
        @ConnectedSocket() client: Socket
    ) {
        const game = this.roomsWithGame.get(data.room);
        if (game) {
            client.emit('game-snapshot', game.getSnapshot());
        }
    }



    @SubscribeMessage('Game-Settings')
    handleGameSettings(
        @MessageBody() data: {
            room: string,
            maxNoOfPlayers: number,
            drawTimer: number,
            maxRounds: number,
            gameMode: GameMode
        },
        @ConnectedSocket() client: Socket
    ){

        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.WAITING){
            return;
        }

        if(data.maxNoOfPlayers < game.players.length){
            client.emit("Cannot decrease player count");
            return;
        }

        // console.log(data);

        game?.setGameSettings(data.maxNoOfPlayers, data.drawTimer, data.maxRounds, data.gameMode);

    }
}