import words from "./words";

enum gameState {
    WAITING = 'waiting',
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
    timer: any;
    round: number;
    gameState: gameState;
    correctGuesses: boolean[];
    playerIdx: number

    constructor() {
        this.players = [];       
        this.guessWords = words;
        this.winnerStack = [];
        this.currentWord = '';
        this.guessers = [];
        this.drawer = '';
        this.scoreBoard = new Map<string, number>();
        this.timer = null;
        this.round = 1;
        this.gameState = gameState.WAITING;
        this.correctGuesses = [];
        this.playerIdx = 0
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

    roundStart(){

        if(this.players.length < 2) {
            return;
        }
        
        this.correctGuesses = new Array(this.guessers.length).fill(false);

        const result = this.playerSelectWord();

        if(!result) return;

        const { drawer, guessWords } = result;

        return {
            drawer, 
            guessWords
        }

    }

    playerSelectWord() {

        if(this.drawer) return;
        this.drawer = this.players[this.playerIdx];

        const threeWords = this.guessWords.sort(() => 0.5 - Math.random()).slice(0, 3);

        return { 
            drawer: this.drawer, 
            guessWords: threeWords,
            playeridx: this.playerIdx++
        };

    }

    playersGuessWord(word: string, player: string) {
        if(word === this.currentWord && this.guessers.includes(player)) {
            this.playerScored();
        }

    }

    roundEnd() {
        if(this.correctGuesses.every(guess => guess === true) || this.timer === 0) {
            // Handle round end logic
        }
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