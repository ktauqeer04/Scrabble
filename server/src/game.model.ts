import words from "./words";

interface gameState {
    WAITING : 'waiting'
    IN_PROGRESS : 'in_progress',
    ENDED : 'ended'
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
        console.log('guessWords', this.guessWords)
        this.addPlayer(player)
    }

    addPlayer(player: string) {
        if(this.players.includes(player)) return;
        this.players.push(player)
        console.log('addPlayer: player added', this.players)
    }

    roundStart(playeridx: number){

        const result = this.playerSelectWord(playeridx);

        if(!result) return;

        const { drawer, guessWords } = result;
        
        console.log('roundStart: drawer selected', drawer)
        console.log('roundStart: guessWords selected', guessWords)

        // this.timer = setTimeout(() => {
        //     const randomWord = guessWords[Math.floor(Math.random() * guessWords.length)];
        //     this.currentWord = randomWord;
        //     console.log('time ran out, auto selected word:', this.currentWord);
        //     // proceed to next phase
        // }, 30000);

        return {
            drawer, 
            guessWords
        }


    }

    playerSelectWord(playeridx: number) {

        if(this.players.length < 2 ) return;
        if(this.drawer) return;
        this.drawer = this.players[playeridx];

        const threeWords = this.guessWords.sort(() => 0.5 - Math.random()).slice(0, 3);

        return { 
            drawer: this.drawer, 
            guessWords: threeWords 
        };

    }

    playersGuessWord() {

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