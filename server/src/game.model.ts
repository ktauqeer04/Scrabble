import words from "./words";

enum gameState {
    WAITING = 'waiting',
    IN_PROGRESS = 'in_progress',
    ENDED = 'ended'
}


export default class Game {

    players: string[];
    guessWords: any;
    winnerStack: any;
    currentWord: any;
    guessers: any;
    drawer: any;
    scoreBoard: any;
    timer: any;
    round: any;
    gameState: gameState;
    allGuesses: boolean[];
    playerIdx: number

    constructor() {
        this.players = [];       
        this.guessWords = [];
        this.winnerStack = [];
        this.guessers = [];
        this.scoreBoard = new Map<string, number>();
        this.round = 1;
        this.currentWord = null;
        this.drawer = null;
        this.timer = null;
        this.gameState = gameState.WAITING;
        this.allGuesses = [];
        this.playerIdx = 0
    }


    startGame(player: any) {
        this.guessWords = words
        // console.log('guessWords', this.guessWords)
        this.addPlayer(player)
        this.gameState = gameState.WAITING;
        const result = this.roundStart();
    }

    addPlayer(player: string) {

        if(this.players.includes(player)) return;

        if(this.gameState === gameState.IN_PROGRESS){
            this.players.push(player)
            return;
        }

        this.players.push(player)
        this.gameState = gameState.IN_PROGRESS;
        
        this.roundStart();

        // console.log('addPlayer: player added', this.players)
    }

    roundStart(){

        if(this.players.length < 2) {
            return;
        }
        
        this.allGuesses = new Array(this.guessers.length).fill(false);

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
        if(this.allGuesses.every(guess => guess === true) || this.timer === 0) {
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
            guessers: this.guessers,
            drawer: this.drawer,
            scoreBoard: this.scoreBoard,
            timer: this.timer,
            winnerStack: this.winnerStack
        }
    }

    playerScored(){

    }

}


// players
// words
// currentWord
// 