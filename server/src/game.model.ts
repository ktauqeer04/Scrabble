import words from "./words";

export enum GameState {
    WAITING = 'waiting',
    PLAYER_CHOOSING = 'player_choosing',
    PLAYER_GUESSING = 'player_guessing',
    HIDDEN_WORD='hidden_word',
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
    gameState: GameState;
    correctGuesses: boolean[];
    playerIdx: number
    completeAction: (() => void) | null;
    timerStartedAt: number | null;
    timerDuration: number;
    choosingTime: number;
    guessingTime: number;


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
        this.gameState = GameState.WAITING;
        this.correctGuesses = [];
        this.playerIdx = 0
        this.completeAction = null
        this.choosingTime = 30000;
        this.guessingTime = 120000;
    }


    startGame() {
        // console.log('guessWords', this.guessWords)
        this.gameState = GameState.WAITING;
    }

    // start of the game, 
    // middle of the game
    // end of the game
    // second player joins -> gamestate is still waiting
    // remaining player joins -> gameState is whatever will be, but not waiting (probably)
    addPlayer(player: string, onComplete?: () => void) {


        if(this.players.includes(player)){
            return { success: false, message: "Player already in game" }
        };

        if(this.players.length == 3){
            return { success: false, message: "Room full" }
        }

        if(this.gameState === GameState.PLAYER_CHOOSING){
            this.players.push(player) 
            return { success: true };
        }

        this.players.push(player);

        // only change state when second player joins
        if(this.players.length === 2) {
            this.gameState = GameState.PLAYER_CHOOSING;
            if(onComplete) this.roundStart(onComplete); 
        }

        return { success: true };
    }


    // round immidiately starts once another player has joined the room 
    // each player receives a chance of drawing
    // in other words: if there are 5 players playing, each will receive a chance of drawing and the remaining ones have to guess
    // round starts  
    roundStart(onComplete: () => void){

        console.log(this.players);

        this.playerSelectWord(() => {
            onComplete();
        })

    }


    // player select word scenario -> 
    // one player will select one word out of three
    // this method will be called in the state of 'player_choosing'
    // the guessors will have to wait till the player selects the word
    // player selection will be over once the player has selected the 
    // word or the timer has ran out in which a random word will be given

    playerSelectWord(onCompleteSelect: () => void) {
        
        if(this.drawer) return;

        let isDone = false;

        this.gameState = GameState.PLAYER_CHOOSING;
        this.guessers = this.players.filter((_, playeridx) => playeridx !== this.playerIdx)
        this.drawer = this.players[this.playerIdx];
        this.correctGuesses = new Array(this.guessers.length).fill(false);

        const threeWords = this.guessWords.sort(() => 0.5 - Math.random()).slice(0, 3);
        this.guessWords = threeWords


        this.timerStartedAt = Date.now();

        this.timer = setTimeout(() => {
            if(isDone) return;
            isDone = true;

            const randomWord = this.guessWords[Math.floor(Math.random() * this.guessWords.length)];
            this.wordSelected(randomWord);

            onCompleteSelect();
        }, 30000)

        this.completeAction = () => {
            if(isDone) return;
            isDone = true;

            clearTimeout(this.timer);
            console.log('Action Manually Completed');
            onCompleteSelect()
        }

    }


    // player Guessed Scenario: 
    // after the player chooses the word
    // the guessers have to guess the word
    // this will work until the timer runs out or all players have guessed the word

    playersStartGuessingWord(word: string, player: string, onCompleteGuessed: (() => void)) {

        if(this.gameState != GameState.PLAYER_GUESSING){
            return;
        }

        // condition : correct word scores the player some point's
        if(word === this.currentWord && this.guessers.includes(player)) {
            // condition : all players have guessed the word except the last one
            this.playerScored();
        }

        let isDone = false;

        this.timerStartedAt = Date.now();

        this.timer = setTimeout(() => {
            if(isDone) return;
            isDone = true;

            onCompleteGuessed();
        }, 120000);

        this.completeAction = () => {
            if(isDone) return;
            isDone = true;

            clearTimeout(this.timer);
            onCompleteGuessed();
        }

    }

    wordSelected(word: any) {

        this.currentWord = word;
        console.log('word selected getting invoked');
        this.gameState = GameState.PLAYER_GUESSING;

    }

    roundEnd() {
    }

    endGame() {

    }

    getTime(timerDuration: number) {

        if(!this.timerStartedAt) return 0;

        const elapsed = Date.now() - this.timerStartedAt;
        const remainingTime = timerDuration - elapsed;

        return Math.max(0, Math.floor(remainingTime / 1000));

    }


    playerScored(){

    }

    getSnapshot() {

        switch(this.gameState){
            case GameState.WAITING:
                return {
                    gamestate: this.gameState,
                    players: this.players, 
                    round: this.round,
                    currentWord: this.currentWord,
                    scoreBoard: this.scoreBoard,
                    // timer: this.timer,
                    winnerStack: this.winnerStack,
                    chooser: {
                        guessWords: this.guessWords,
                        drawer: this.drawer
                    },
                    allGuessers: {
                        guessers: this.guessers,
                    },
                    // timeLeft: this.getTime()
                }
            
            case GameState.PLAYER_CHOOSING:
                return {
                    gamestate: this.gameState,
                    players: this.players, 
                    round: this.round,
                    currentWord: this.currentWord,
                    scoreBoard: this.scoreBoard,
                    // timer: this.timer,
                    winnerStack: this.winnerStack,
                    chooser: {
                        guessWords: this.guessWords,
                        drawer: this.drawer
                    },
                    allGuessers: {
                        guessers: this.guessers,
                    },
                    timeLeft: this.getTime(this.choosingTime)
                }

            case GameState.PLAYER_GUESSING:
                return {
                    gamestate: this.gameState,
                    players: this.players, 
                    round: this.round,
                    currentWord: this.currentWord,
                    scoreBoard: this.scoreBoard,
                    // timer: this.timer,
                    winnerStack: this.winnerStack,
                    chooser: {
                        guessWords: this.guessWords,
                        drawer: this.drawer
                    },
                    allGuessers: {
                        guessers: this.guessers,
                    },
                    timeLeft: this.getTime(this.guessingTime)
                }
            
            case GameState.HIDDEN_WORD : 
                return {
                    gamestate: this.gameState,
                    players: this.players, 
                    round: this.round,
                    currentWord: this.currentWord,
                    scoreBoard: this.scoreBoard,
                    // timer: this.timer,
                    winnerStack: this.winnerStack,
                    chooser: {
                        guessWords: this.guessWords,
                        drawer: this.drawer
                    },
                    allGuessers: {
                        guessers: this.guessers,
                    },
                    timeLeft: this.getTime(3000)
                }
            
            case GameState.ENDED:
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
                    },
                    // timeLeft: this.getTime()
                }
            
        }

    }

}


// players
// words
// currentWord
// 