import words from "./words";

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

    constructor() {
        this.players = [];        // ← was undefined, now an empty array
        this.guessWords = [];
        this.winnerStack = [];
        this.guessers = [];
        this.scoreBoard = {};
        this.round = 1;
        this.currentWord = null;
        this.drawer = null;
        this.timer = null;
    }


    startGame(player: any) {
        this.guessWords = words
        this.roundStart(player)
    }

    roundStart(player: string) {
        if(this.players.includes(player)) return;
        this.players.push(player)
        console.log('roundStart: player added', this.players)
    }

    playerSelectWord() {

    }

    playersGuessWord() {

    }

    roundEnd() {

    }

    endGame() {

    }

    getSnapshot() {
        return {
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

}


// players
// words
// currentWord
// 