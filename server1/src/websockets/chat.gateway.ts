import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage,OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer, OnGatewayInit } from "@nestjs/websockets";
import { createAdapter } from "@socket.io/redis-adapter";
import type { RedisClientType } from "redis";
import { Server, Socket } from "socket.io";
import { GameMode, GameState } from "src/enums";
import Game from "src/game.model";

@Injectable()
@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server!: Server;
    private logger: Logger = new Logger('ChatGateway');

    private roomsWithGame: Map<string, Game> = new Map();
    private usernameWithClientId: Map<string, string> = new Map();
    private clientWithRoom: Map<string,string> = new Map();


    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
        @Inject('REDIS_PUB') private readonly redisPub: RedisClientType,
        @Inject('REDIS_SUB') private readonly redisSub: RedisClientType,
        @Inject('REDIS_ADAPTER_PUB') private readonly adapterPub: RedisClientType,
        @Inject('REDIS_ADAPTER_SUB') private readonly adapterSub: RedisClientType
    ) {}

    afterInit(){
        this.server.adapter(createAdapter(this.adapterPub, this.adapterSub));
        this.logger.log('Redis Adapter attached');
        console.log(`[${process.env.INSTANCE_ID}] adapter attached`);

    }

     
    async onModuleInit() {

        try{

            if (!this.redis.isOpen) await this.redis.connect();
            if (!this.redisPub.isOpen) await this.redisPub.connect();
            if (!this.redisSub.isOpen) await this.redisSub.connect();
            if (!this.adapterPub.isOpen) await this.adapterPub.connect();
            if (!this.adapterSub.isOpen) await this.adapterSub.connect();

            this.logger.log('Successfully connected to Redis container');

            await this.redisSub.subscribe(`inbox:${process.env.INSTANCE_ID}`, (raw) => {

                const { event, data, socketId } = JSON.parse(raw);

                if(event == 'createRoom') console.log("THIS SHIT ACTUALLY WORKSSSS");
                if(event == 'joinRoom') this.joinRoomMethod(data, socketId);
                if(event == 'Start-Game') this.startGameMethod(data, socketId);
                if(event == 'start-countdown') this.startCountDown(data);
                if(event == 'draw') this.drawMethod(data, socketId);
                if(event == 'bucketFill') this.bucketFillMethod(data, socketId);
                if(event == 'undoLastAction') this.undoLastActionMethod(data);
                if(event == 'clearCanvas') this.clearCanvasMethod(data);
                if(event == 'requestReplay') this.requestReplayMethod(data, socketId);
                if(event == 'chatMessage') this.chatMessageMethod(data, socketId);
                if(event == 'chosen-word') this.chosenWordMethod(data, socketId);
                if(event == 'requestSnapshot') this.requestSnapshotMethod(data, socketId);
                if(event == 'Game-Settings') this.gameSettingsMethod(data, socketId);
                if(event === 'playerDisconnected') this.disconnectMethod(data.room, data.username);
            })


        }catch (error) {
            this.logger.error('Failed to connect to Redis Container', error);
        }

    }

    async handleConnection(client: any, ...args: any[]) {
        
    }

    // problem: handleDisconnect can only send clientId to the server, not the room
    async handleDisconnect(client: Socket) {

        console.log('handleDisconnect gets called');

        console.log("map with sockets is ", this.usernameWithClientId)

        let flag = false;

        for (const [username, socketId] of this.usernameWithClientId) {
            if (socketId !== client.id) continue;

            const room = this.clientWithRoom.get(socketId) as string;

            if (this.roomsWithGame.has(room)) {
                this.disconnectMethod(room, username);
                console.log('does this gets called?')
            }


            console.log('publish gets called')
            const ownerId = await this.redis.get(`owner:${room}`);
            console.log('ownerId is ', ownerId);
            if (ownerId) {
                console.log('publish gets called')
                await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
                    event: 'playerDisconnected',
                    data: { room, username },
                }));
            }
            

            this.usernameWithClientId.delete(username);
            
        }

        
    }

    private disconnectMethod(room: string, username: string) {

        console.log('disconnect method gets called from other instance');

        const game = this.roomsWithGame.get(room) as Game; // real Game object — this only runs on the owner

        const newPlayersArray = game.players.filter(name => name != username);
        game.players = newPlayersArray;
        game.scoreBoard.delete(username);

        this.server.to(room).emit("playerLeft", `${username} has left the room`);

        if (username == game.drawer) {
            if (game.gameState == GameState.PLAYER_CHOOSING) {
                game.completeChooseAction?.();
                game.completeGuessAction?.();
                game.completeHiddenAction?.();
            }
            if (game.gameState == GameState.PLAYER_GUESSING) {
                game.completeGuessAction?.();
            }
        }

        // NOTE: usernameWithClientId.delete(username) and client.leave(room)
        // were REMOVED from here — they stayed in handleDisconnect above,
        // since this method might run on a DIFFERENT instance than where
        // those maps/socket actually live.

        if (game.players.length == 1) {
            console.log('game has officially ended');
            game.gameState = GameState.ENDED;
            game.endGame(() => {
                this.server.to(room).emit('gameWinner', `${game.winnerName} has won the game`);
            },
            () => {
                this.broadcastPersonalizedSnapshot(room, game);
            });
        }

        this.broadcastPersonalizedSnapshot(room, game);

        if (game.players.length == 0) {
            game.endGame(() => {}, () => {});
            this.roomsWithGame.delete(room);

            // this cleanup is about the OWNER's clientWithRoom map, so it's only
            // correct for entries that were ever set on THIS instance — see note below
            this.clientWithRoom.forEach((r, socketId) => {
                if (r == room) {
                    this.clientWithRoom.delete(socketId);
                }
            });

            console.log(`${room} game has ended`);
        }
    }


    private async broadcastPersonalizedSnapshot(room: string, game: Game) {
        const sockets = await this.server.in(room).fetchSockets();

        for (const socket of sockets) {
            const username = [...this.usernameWithClientId.entries()]
                .find(([_, id]) => id === socket.id)?.[0];

            this.server.to(socket.id).emit('game-snapshot', game.getSnapshot(username));
        }
    }


    private drawMethod(
        data: {
            room: string,
            payload: any,
            username: string
        },
        socketId: string
    ) {

        const game = this.roomsWithGame.get(data.room);

        if(game){

            if(game?.gameState != GameState.PLAYER_GUESSING) return;
            if(data.username != game.drawer) return;

            // payload now carries a strokeId (see client changes) so segments
            // belonging to one stroke can be undone together
            game.canvasSnapshot.push(data.payload);

            this.server.to(data.room).except(socketId).emit('updateDrawing', data.payload)
            // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
            this.broadcastPersonalizedSnapshot(data.room, game);

        }

    }

    @SubscribeMessage('draw')
    async handleEventDraw(
        @MessageBody() data: { room: string, payload: any, username: string},
        @ConnectedSocket() client: Socket,
    ) {

        if(this.roomsWithGame.has(data.room)){
            this.drawMethod(data, client.id);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'draw',
            data,
            socketId: client.id
        }));

    }


    private bucketFillMethod(
        data: {
            room: string,
            username: string,
            payload: any
        },
        socketId: string
    ) {
        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.PLAYER_GUESSING) return;
        if(data.username != game.drawer) return;

        // payload: { x, y, color, tool: 'fill' }
        game.canvasSnapshot.push(data.payload);

        this.server.to(data.room).except(socketId).emit('updateBucketFill', data.payload)
        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot())
        this.broadcastPersonalizedSnapshot(data.room, game);
    }


    @SubscribeMessage('bucketFill')
    async handleEventBucketFill(
        @MessageBody() data: { room: string, payload: any, username: string },
        @ConnectedSocket() client: Socket,
    ) {

        if(this.roomsWithGame.has(data.room)){
            this.bucketFillMethod(data, client.id);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'bucketFill',
            data,
            socketId: client.id
        }));
        
    }


    private undoLastActionMethod(
        data: {
            room: string,
            username: string
        },

    ) {
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
    }

    // the last action of the drawer is checked, if they used bucket fill or a stroke
    // if bucket filled then pop it out
    // if it is a stroke, remove that stroke using the strokeId
    @SubscribeMessage('undoLastAction')
    async handleUndo(
        @MessageBody() data: { room: string, username: string },
        @ConnectedSocket() client: Socket,
    ) {

        if(this.roomsWithGame.has(data.room)){
            this.undoLastActionMethod(data);
            return;
        }
        
        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'undoLastAction',
            data,
            socketId: client.id
        }))


    }


    private clearCanvasMethod(
        data: {
            room: string,
            username: string,
        },
    ) {
        const game = this.roomsWithGame.get(data.room);
        if(game?.gameState != GameState.PLAYER_GUESSING) return;
        if(data.username != game.drawer) return;

        // since the canvas is suppose to be empty, the new users will never get whatever was drawn
        game.canvasSnapshot = [];

        // client.to(data.room).emit('game-snapshot', game?.getSnapshot())
        // this.broadcastPersonalizedSnapshot(data.room, game);
        this.server.to(data.room).emit('updateCanvas');
    }


    @SubscribeMessage('clearCanvas')
    async handleEventClearCanvas(
        @MessageBody() data: { room: string, username: string },
        @ConnectedSocket() client: Socket,
    ){

        if(this.roomsWithGame.has(data.room)){
            this.clearCanvasMethod(data);
            return;
        }
        
        const ownerId = await this.redis.get(`owner:${data.room}`);
        
        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'clearCanvas',
            data,
            socketId: client.id
        }))


    }


    private requestReplayMethod(
        data: {
            room: string
        },
        socketId: string
    ){

        const game = this.roomsWithGame.get(data.room);

        if (game?.gameState === GameState.PLAYER_GUESSING) {
            // canvasSnapshot is now a mixed array of stroke segments and fill
            // entries — client's replay handler needs to branch on entry.tool
            this.server.to(socketId).emit("replayDrawing", game.canvasSnapshot);
        }

    }


    @SubscribeMessage('requestReplay')
    async handleRequestReplay(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        if(this.roomsWithGame.has(data.room)){
            this.requestReplayMethod(data, client.id);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);
        
        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'requestReplay',
            data,
            socketId: client.id
        }))


    }


    private chatMessageMethod(
        data: {
            room: string,
            message: string,
            username: string
        },
        socketId: string
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
                    // data.message = `${data.username} has guessed the word`;
                    this.server.to(data.room).emit('correctAnswer', `${data.username} has guessed the word`)
                    
                },
                () => {
                    const closeAnswer = data.message + " is almost close"
                    this.server.to(socketId).emit("closeCorrectAnswer", closeAnswer);
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

    @SubscribeMessage('chatMessage')
    async handleEventChatMessage(
        @MessageBody() data: { room: string, message: string, username: string},
        @ConnectedSocket() client: Socket,
    ){
        
        if(this.roomsWithGame.has(data.room)){
            this.chatMessageMethod(data, client.id);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId){
            client.emit('roomNotExists', { message: 'Room does not exist', flag: false });
            return;
        }
        
        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event:'chatMessage',
            data: data,
            socketId: client.id
        }))

    }



    // user that creates this room is the first person to join the room 

    private createRoomMethod(data: {room: string, username: string }, client: Socket) {

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

    @SubscribeMessage('createRoom')
    async handleEventCreateRoom(
        @MessageBody() data: {
            room: string,
            username: string
        },
        @ConnectedSocket() client: Socket,
    ){

        await this.redis.set(`owner:${data.room}`, String(process.env.INSTANCE_ID)); // STEP 1 now
        this.createRoomMethod(data, client);

        console.log('redis event sent');
        
    }

    // user joining the room are second onwards

    private joinRoomMethod(data: { room: string, username: string }, clientId: string ) {


        const game = this.roomsWithGame.get(data.room) as Game;

        const addplayer = game?.addPlayer(data.username);

        if (addplayer?.success == false) {
            this.server.to(clientId).emit('cannot-join-game', addplayer.message); // emit to client, not room
            return;
        }

        this.usernameWithClientId.set(data.username, clientId);
        this.clientWithRoom.set(clientId, data.room);

        this.server.to(clientId).emit('joinedRoom', { message: 'Joined Room Successfully', flag: true });

        if(game.gameState == GameState.WAITING) {
            game.waitingTimerStart(() => {
                this.server.to(data.room).emit("timeout");
                this.server.in(data.room).disconnectSockets(true);
            });
        }

        if(game?.gameState == GameState.PLAYER_GUESSING){
            // console.log(game.canvasSnapshot);
            this.server.to(clientId).emit("replayDrawing", game.canvasSnapshot);
        }

        this.server.to(data.room).emit("joinRoom", `${data.username} has join the room`);
        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot()); 
        this.broadcastPersonalizedSnapshot(data.room, game);
    }

    @SubscribeMessage('joinRoom')
    async handleEventJoinRoom(
        @MessageBody() data: {
            room: string, 
            username: string
        }, 
        @ConnectedSocket() client: Socket
    ) {

        // joining room in the current instance 
        // this is for people in the same node instance
        if (this.roomsWithGame.has(data.room)) {

            client.join(data.room);
            this.joinRoomMethod(data, client.id);

            return;
        }


        // not present in current instance, lets check-up the other instances. 
        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId){
            client.emit('roomNotExists', { message: 'Room does not exist', flag: false });
            return;
        }

        client.join(data.room);
        
        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event:'joinRoom',
            data: data,
            socketId: client.id
        }))


    }


    private startGameMethod(
        data: {
            room: string,
            maxPlayers: number, 
            drawTime: number, 
            noOfRounds: number 
        },
        socketId: string
    ){


        const game = this.roomsWithGame.get(data.room) as Game;

        console.log("game state is :", game.gameState);

        if(game?.players.length == 1){
            this.server.to(socketId).emit('cannot-start-game', false);
            return;
        }
        
        game.waitingTimerBreak(); // no longer just waiting, the game has started, so ditch the background timer kicks you out after over. 


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

    // the game just starts
    @SubscribeMessage('Start-Game')
    async handleEventStartGame(
        @MessageBody() data: {
            room: string,
            maxPlayers: number, 
            drawTime: number, 
            noOfRounds: number
        },
        @ConnectedSocket() client: Socket,
    ){

        if(this.roomsWithGame.has(data.room)) {
            this.startGameMethod(data, client.id);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'Start-Game',
            data,
            socketId: client.id
        }))

    }


    private chosenWordMethod(data: { room: string, chosenWord: string }, socketId: string) {
        const game = this.roomsWithGame.get(data.room);

        if(game?.gameState != GameState.PLAYER_CHOOSING){
            this.server.in(socketId).disconnectSockets(true);
            return;
        }

        if(!game?.guessWords.includes(data.chosenWord)){
            this.server.in(socketId).disconnectSockets(true);
            return;
        }

        game?.wordSelected(data.chosenWord);
        game?.completeChooseAction?.();

        // this.server.to(data.room).emit('game-snapshot', game?.getSnapshot());
        this.broadcastPersonalizedSnapshot(data.room, game);
    }

    @SubscribeMessage('chosen-word')
    async handleEventChosenWord(
        @MessageBody() data: {room : string, chosenWord: string},
        @ConnectedSocket() client: Socket
    ) {

        if(this.roomsWithGame.has(data.room)){

            this.chosenWordMethod(data, client.id);
            return;

        }

        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) {
            return;
        }

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            data,
            event: 'chosen-word',
            socketId: client.id
        }))


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


    private requestSnapshotMethod(
        data: {
            room: string
        },
        socketId: string
    ) {
        const game = this.roomsWithGame.get(data.room);
        if (game) {
            this.broadcastPersonalizedSnapshot(data.room, game);
        }
    }

    @SubscribeMessage('requestSnapshot')
    async handleRequestSnapshot(
        @MessageBody() data: {
            room: string
        }, 
        @ConnectedSocket() client: Socket
    ) {

        if(this.roomsWithGame.has(data.room)){

            this.requestSnapshotMethod(data, client.id);
            return;
        }
        
        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) {
            return;
        }

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            data,
            event: 'requestSnapshot',
            socketId: client.id
        }))

    }


    private gameSettingsMethod(
        data: {
            room: string,
            maxNoOfPlayers: number,
            drawTimer: number,
            maxRounds: number,
            gameMode: GameMode
        },
        socketId: string
    ) {

        const game = this.roomsWithGame.get(data.room) as Game;

        if(game.gameState != GameState.WAITING){
            return;
        }

        if(data.maxNoOfPlayers < game.players.length){
            this.server.to(socketId).emit("Cannot decrease player count");
            return;
        }

        // console.log(data);

        game?.setGameSettings(data.maxNoOfPlayers, data.drawTimer, data.maxRounds, data.gameMode);

    }


    @SubscribeMessage('Game-Settings')
    async handleGameSettings(
        @MessageBody() data: {
            room: string,
            maxNoOfPlayers: number,
            drawTimer: number,
            maxRounds: number,
            gameMode: GameMode
        },
        @ConnectedSocket() client: Socket
    ){


        if(this.roomsWithGame.has(data.room)){
            this.gameSettingsMethod(data, client.id);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);
        
        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'Game-Settings',
            data,
            socketId: client.id
        }))

    }


    private startCountDown(
        data: {
            room: string
        }
    ){
        const game = this.roomsWithGame.get(data.room) as Game;

        if(game.gameState != GameState.WAITING){
            return;
        }

        game.waitingTimerStart(() => {
            this.server.to(data.room).emit("timeout");
            this.server.in(data.room).disconnectSockets(true);
        })
        
    }


    @SubscribeMessage('start-countdown')
    async handleStartCountdown(
        @MessageBody() data: {
            room: string,
        },
        @ConnectedSocket() client: Socket
    ){

        if(this.roomsWithGame.has(data.room)){
            this.startCountDown(data);
            return;
        }

        const ownerId = await this.redis.get(`owner:${data.room}`);

        if(!ownerId) return;

        await this.redisPub.publish(`inbox:${ownerId}`, JSON.stringify({
            event: 'start-countdown',
            data
        }));

    }


}