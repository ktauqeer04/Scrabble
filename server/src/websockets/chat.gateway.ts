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
                game.scoreBoard.delete(username);

                this.server.to(room).emit("playerLeft", `${username} has left the room`);


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

                // console.log('players array length ', game.players.length);

                this.usernameWithClientId.delete(username);

                client.leave(room);

                //game ends when only one player is in the room
                if(game.players.length == 1){
                    console.log('game has officially ended');
                    // I need to end the game here, the game cannot be played with only 1 people in it. 
                    // but I need to break all the running tasks
                    game.gameState = GameState.ENDED;
                    game.endGame(() => {
                        this.server.to(room).emit('gameWinner', `${game.winnerName} has won the game`);
                    }, 
                    () => {
                        this.broadcastPersonalizedSnapshot(room, game);
                        // this.server.to(room).emit('game-snapshot', game.getSnapshot())
                    } 
                    )
                }

                this.broadcastPersonalizedSnapshot(room, game);
                // this.server.to(room).emit('game-snapshot', game?.getSnapshot())

                //game ends when all the players leave the room
                if(game.players.length == 0){

                    game.endGame(() => {}, () => {}); // nothing to execute since all the players have left, but need an argument

                    this.roomsWithGame.delete(room);

                    this.clientWithRoom.forEach((r, socketId) => {
                        if(r == room){
                            this.clientWithRoom.delete(socketId);
                        }
                    })

                    console.log(`${room} game has ended`);

                }

            }

        })

    }

    handleConnection(client: any, ...args: any[]) {
        
    }

    private broadcastPersonalizedSnapshot(room: string, game: Game) {
        const socketsInRoom = this.server.sockets.adapter.rooms.get(room);
        if (!socketsInRoom) return;

        socketsInRoom.forEach(socketId => {
            const username = [...this.usernameWithClientId.entries()]
                .find(([_, id]) => id === socketId)?.[0];

            this.server.to(socketId).emit('game-snapshot', game.getSnapshot(username));
        });
    }


    @SubscribeMessage('draw')
    handleEventDraw(
        @MessageBody() data: { room: string, payload: any, username: string},
        @ConnectedSocket() client: Socket,
    ): any {

        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.PLAYER_GUESSING) return;
        if(data.username != game.drawer) return;

        // payload now carries a strokeId (see client changes) so segments
        // belonging to one stroke can be undone together
        game.canvasSnapshot.push(data.payload);

        client.to(data.room).emit('updateDrawing', data.payload)
        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.broadcastPersonalizedSnapshot(data.room, game);
    }

    @SubscribeMessage('bucketFill')
    handleEventBucketFill(
        @MessageBody() data: { room: string, payload: any, username: string },
        @ConnectedSocket() client: Socket,
    ): any {

        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.PLAYER_GUESSING) return;
        if(data.username != game.drawer) return;

        // payload: { x, y, color, tool: 'fill' }
        game.canvasSnapshot.push(data.payload);

        client.to(data.room).emit('updateBucketFill', data.payload)
        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.broadcastPersonalizedSnapshot(data.room, game);
    }


    // the last action of the drawer is checked, if they used bucket fill or a stroke
    // if bucket filled then pop it out
    // if it is a stroke, remove that stroke using the strokeId
    @SubscribeMessage('undoLastAction')
    handleUndo(
        @MessageBody() data: { room: string, username: string },
        @ConnectedSocket() client: Socket,
    ): any {

        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.PLAYER_GUESSING) return;
        if(data.username != game.drawer) return;
        if(!game.canvasSnapshot.length) return;

        const last = game.canvasSnapshot[game.canvasSnapshot.length - 1];

        if (last.tool === 'fill') {
            game.canvasSnapshot.pop();
        } else {
            const strokeId = last.strokeId;
            while (
                game.canvasSnapshot.length &&
                game.canvasSnapshot[game.canvasSnapshot.length - 1].strokeId === strokeId
            ) {
                game.canvasSnapshot.pop();
            }
        }

        this.server.to(data.room).emit('canvasUndo', game.canvasSnapshot);
        // this.broadcastPersonalizedSnapshot(data.room, game);
        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
    }

    @SubscribeMessage('clearCanvas')
    handleEventClearCanvas(
        @MessageBody() data: { room: string, username: string },
        @ConnectedSocket() client: Socket,
    ){

        const game = this.roomsWithGame.get(data.room);
        if(game?.gameState != GameState.PLAYER_GUESSING) return;
        if(data.username != game.drawer) return;

        // since the canvas is suppose to be empty, the new users will never get whatever was drawn
        game.canvasSnapshot = [];

        // client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        // this.broadcastPersonalizedSnapshot(data.room, game);
        this.server.to(data.room).emit('updateCanvas');
    }

    @SubscribeMessage('requestReplay')
    handleRequestReplay(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const game = this.roomsWithGame.get(data.room);
        if (game?.gameState === GameState.PLAYER_GUESSING) {
            // canvasSnapshot is now a mixed array of stroke segments and fill
            // entries — client's replay handler needs to branch on entry.tool
            client.emit("replayDrawing", game.canvasSnapshot);
        }
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

            // if(game.drawer == data.username){
            //     // this.server.to(guessedUsersSocketIds).emit('receiveCorrectChatMessage', data.message);
            //     return;
            // }

            if(game.correctGuesses.get(data.username) == true || game.drawer == data.username){
                
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

        // client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.server.to(data.room).emit('receiveChatMessage', { message: data.message, username: data.username })
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

        const game = new Game();
        this.roomsWithGame.set(data.room, game);
        game.startGame();
        game.addPlayer(data.username);

        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.broadcastPersonalizedSnapshot(data.room, game);
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

        const game = this.roomsWithGame.get(data.room) as Game;


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
        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); 
        this.broadcastPersonalizedSnapshot(data.room, game);

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

        if(game?.players.length == 1){
            client.emit('cannot-start-game', false);
            return;
        }

        game?.roundStart(() => {

            game.startGuessingPhase(() => {

                console.log("does this getss called??");
                game.showHiddenWord(() => {

                    game.nextTurn(
                    () => {
                        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()) // function parameters 
                        this.broadcastPersonalizedSnapshot(data.room, game);
                    },
                    () => {
                        game.endGame(() => {
                            this.server.to(data.room).emit('gameWinner', `${game.winnerName} has won the game`);
                        }, 
                        () => {
                            // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
                            this.broadcastPersonalizedSnapshot(data.room, game);
                        }
                    )
                        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); // function parameters
                        this.broadcastPersonalizedSnapshot(data.room, game);
                        this.server.to(data.room).emit('receiveRoundOverMessage', 'Game has Ended');
                    },
                    () => {

                        this.server.to(data.room).emit('receiveRoundOverMessage', `Round Over, the word was ${game.currentWord}`);
                        this.server.to(data.room).emit('updateCanvas');

                    },
                    () => {
                        this.server.to(data.room).emit('receiveDrawerMessage', `${game?.drawer} is drawing`)
                    },
                    () => {
                        this.server.to(data.room).emit('updateCanvas');
                    }
                )

                    // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
                    this.broadcastPersonalizedSnapshot(data.room, game);

                })

                game.markPlayerScores();

                console.log("lets see if this gets called");
                // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()) // third emit player choosing after 25 seconds of guessing 
                this.broadcastPersonalizedSnapshot(data.room, game);
                console.log("updateCanvas event gets called");
                this.server.to(data.room).emit('updateCanvas');

            },
            () => {

                this.server.to(data.room).emit('receiveRoundOverMessage', `Round Over, the word was ${game.currentWord}`);

            } 
            )
            
            this.server.to(data.room).emit('receiveDrawerMessage', `${game?.drawer} is drawing`)
            // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()) // second emit player guessing after 20 seconds of choosing
            this.broadcastPersonalizedSnapshot(data.room, game);

        });

        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); // first emit player choosing immediately
        this.broadcastPersonalizedSnapshot(data.room, game);

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

        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
        this.broadcastPersonalizedSnapshot(data.room, game);
    }

    // @SubscribeMessage('playerLeft')
    // handleEventPlayerLeft(
    //     @MessageBody() data: {room : string, socketId: string},
    //     @ConnectedSocket() client: Socket
    // ) {

    //     const game = this.roomsWithGame.get(data.room);
       
    //     console.log("player left event listened");

    //     this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
    // }


    // server


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