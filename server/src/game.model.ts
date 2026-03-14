import words from "./words";

enum gameState {
    WAITING = 'waiting',
    PLAYER_CHOOSING = 'player_choosing',
    PLAYER_GUESSING = 'player_guessing',
    IN_PROGRESS = 'in_progress',
    ENDED = 'ended'
}


export default class Game {

    players: string[];
    guessWords: string[];
    winnerStack: [];
    currentWord: string;
    guessers: string[];
    drawer: string;
    scoreBoard: {};
    timer: NodeJS.Timeout | undefined;
    round: number;
    gameState: gameState;
    correctGuesses: boolean[];
    playerIdx: number
    completeAction: (() => void) | null;

    constructor() {
        this.players = [];       
        this.guessWords = words;
        this.winnerStack = [];
        this.currentWord = '';
        this.guessers = [];
        this.drawer = '';
        this.scoreBoard = new Map<string, number>();
        this.timer = undefined;
        this.round = 1;
        this.gameState = gameState.WAITING;
        this.correctGuesses = [];
        this.playerIdx = 0
        this.completeAction = null
    }


    startGame(player: any) {
        // console.log('guessWords', this.guessWords)
        this.addPlayer(player)
        this.gameState = gameState.WAITING;
    }

    addPlayer(player: string) {

        // console.log('player array size', this.players.length);

        if(this.players.includes(player)){
            return {
                success: false,
                message: "Player already in game"
            }
        };

        if(this.players.length == 3){
            return {
                success: false,
                message: "Room full"
            }
        }

        if(this.gameState === gameState.IN_PROGRESS){
            this.players.push(player)
            return;
        }

        this.players.push(player)
        this.gameState = gameState.IN_PROGRESS;
        
        this.roundStart();

        return { success: true };

        // console.log('addPlayer: player added', this.players)
    }


    // round immidiately starts once another player has joined the room 
    // each player receives a chance of drawing
    // in other words: if there are 5 players playing, each will receive a chance of drawing and the remaining ones have to guess
    // round starts  
    roundStart(){

        if(this.players.length < 2) {
            return;
        }

        this.playerSelectWord(() => {

        });

    }


    // player select word scenario -> 
    // one player will select one word out of three
    // this method will be called in the state of 'player_choosing'
    // the guessors will have to wait till the player selects the word
    // player selection will be over once the player has selected the 
    // word or the timer has ran out in which a random word will be given

    playerSelectWord(onComplete: () => void) {
        
        if(this.drawer) return;

        let isDone = false;

        this.gameState = gameState.PLAYER_CHOOSING;
        this.guessers = this.players.filter((_, playeridx) => playeridx !== this.playerIdx)
        this.drawer = this.players[this.playerIdx];
        this.correctGuesses = new Array(this.guessers.length).fill(false);

        const threeWords = this.guessWords.sort(() => 0.5 - Math.random()).slice(0, 3);
        this.guessWords = threeWords

        this.timer = setTimeout(() => {
            if(isDone) return;
            isDone = true;

            onComplete();
        }, 60000)

        this.completeAction = () => {
            if(isDone) return;
            isDone = true;

            clearTimeout(this.timer);
            console.log('Action Manually Completed');
            onComplete()
        }


    }

    playersStartGuessingWord(word: string, player: string) {

        this.gameState = gameState.PLAYER_GUESSING;

        // condition : correct word scores the player some point's
        if(word === this.currentWord && this.guessers.includes(player)) {
            // condition : all players have guessed the word except the last one
            this.playerScored();
        }

    }

    roundEnd() {
    }

    endGame() {

    }

    getSnapshot() {
        return {
            gamestate: this.gameState,
            players: this.players, 
            round: this.round,
            currentWord: this.currentWord,
            scoreBoard: this.scoreBoard,
            timer: this.timer,
            winnerStack: this.winnerStack,
            chooser: {
                guessWords: this.guessWords,
                drawer: this.drawer
            },
            allGuessers: {
                guessers: this.guessers,
            }
        }
    }

    playerScored(){

    }

}


// players
// words
// currentWord
// 