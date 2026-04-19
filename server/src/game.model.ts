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
    chooseTimer: NodeJS.Timeout | undefined;
    guessTimer: NodeJS.Timeout | undefined;
    revealWordTimer: NodeJS.Timeout | undefined;
    round: number;
    gameState: GameState;
    correctGuesses: Map<string,boolean>;
    playerIdx: number
    completeChooseAction: (() => void) | null;
    completeGuessAction: (() => void) | null;
    timerStartedAt: number | null;
    timerDuration: number;
    choosingTime: number;
    guessingTime: number;
    revealWordTime: number;

    constructor() {
        this.players = [];       
        this.guessWords = words;
        this.winnerStack = [];
        this.currentWord = '';
        this.guessers = [];
        this.drawer = '';
        this.scoreBoard = new Map<string, number>();
        this.chooseTimer = undefined;
        this.guessTimer = undefined;
        this.revealWordTimer = undefined;
        this.round = 1;
        this.gameState = GameState.WAITING;
        this.correctGuesses = new Map();
        this.playerIdx = 0
        this.completeChooseAction = null
        this.completeGuessAction = null
        this.choosingTime = 20000;
        this.guessingTime = 50000;
        this.revealWordTime = 3000;
        this.timerStartedAt = 0;
        this.timerDuration = 0;
    }


    startGame() {
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

        if(this.players.length == 4){
            return { success: false, message: "Room full" }
        }

        // if(this.gameState === GameState.PLAYER_CHOOSING){
        //     this.players.push(player);
        //     this.guessers.push(player);
        //     return { success: true };
        // }

        this.players.push(player);
        this.guessers.push(player);


        return { success: true };

    }


    // round immidiately starts once another player has joined the room 
    // each player receives a chance of drawing
    // in other words: if there are 5 players playing, each will receive a chance of drawing and the remaining ones have to guess
    // round starts  
    roundStart(onComplete: () => void){

        console.log(this.players);
        this.gameState = GameState.PLAYER_CHOOSING;

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

        let isDone = false;

        this.guessers = this.players.filter((_, playeridx) => playeridx !== this.playerIdx);
        this.drawer = this.players[this.playerIdx];
        this.correctGuesses = new Map<string, boolean>(this.guessers.map(key => [key, false]));
        console.log(this.correctGuesses);

        const threeWords = words.sort(() => 0.5 - Math.random()).slice(0, 3);
        this.guessWords = threeWords


        this.timerStartedAt = Date.now();

        this.chooseTimer = setTimeout(() => {
            if(isDone) return;
            isDone = true;

            const randomWord = this.guessWords[Math.floor(Math.random() * this.guessWords.length)];
            this.wordSelected(randomWord);
            this.gameState = GameState.PLAYER_GUESSING;

            onCompleteSelect();
        }, 20000)

        this.completeChooseAction = () => {
            if(isDone) return;
            isDone = true;

            this.gameState = GameState.PLAYER_GUESSING;

            if(this.chooseTimer) clearTimeout(this.chooseTimer);
            console.log('Action Manually Completed');
            onCompleteSelect()
        }

    }


    // player Guessed Scenario: 
    // after the player chooses the word
    // the guessers have to guess the word
    // this will work until the timer runs out or all players have guessed the word

    startGuessingPhase(onCompleteGuessed: (() => void)){

        let isDone = false;

        this.timerStartedAt = Date.now();

        this.guessTimer  = setTimeout(() => {
            if(isDone) return;
            isDone = true;

            this.gameState = GameState.HIDDEN_WORD;

            onCompleteGuessed();
        }, 50000);

        this.completeGuessAction = () => {
            if(isDone) return;
            isDone = true;

            this.gameState = GameState.PLAYER_CHOOSING;

            if(this.guessTimer) clearTimeout(this.guessTimer );
            onCompleteGuessed();
        }

    }

    checkGuess(word: string, player: string, onFirstGuessed:() => void){

        console.log("----------------CHECK GUESS GETTING INVOKED----------------------");

        if(word === this.currentWord && this.guessers.includes(player) && !this.correctGuesses.get(player)) {
            console.log("player has guessed the word");
            this.correctGuesses.set(player, true);
            onFirstGuessed();
            // this.playerScored();
        }

    }


    showHiddenWord(onCompleteHiddenWord: () => void){

        console.log('Hidden Word is', this.currentWord);

        this.revealWordTimer = setTimeout(() => {
            this.gameState = GameState.PLAYER_CHOOSING;
            onCompleteHiddenWord();
        }, 3000)
        
    }


    wordSelected(word: any) {

        this.currentWord = word;
        console.log('word selected getting invoked');
        this.gameState = GameState.PLAYER_GUESSING;

    }


    // recursion function that will on break once a single round has 
    nextTurn(onBroadcast: () => void, onRoundComplete: () => void){

        console.log("player index ", this.playerIdx);
        console.log("player length", this.players.length);

        this.playerIdx += 1;
        this.drawer = '';
        this.currentWord = '';
        this.correctGuesses = new Map<string, boolean>(this.guessers.map(key => [key, false]));
        // this.gameState = GameState.PLAYER_CHOOSING;
        if(this.chooseTimer) { clearTimeout(this.chooseTimer); this.chooseTimer = undefined; }
        if(this.guessTimer) { clearTimeout(this.guessTimer); this.guessTimer = undefined; }



        if(this.playerIdx >= this.players.length){
            if(this.round == 3){
                onRoundComplete();
                return;
            }
            this.playerIdx = 0;
            this.round += 1;
        }

        this.playerSelectWord(() => {
            console.log('Next turn playerSelect log')
            this.startGuessingPhase(() => {

                this.showHiddenWord(() => {

                    this.nextTurn(onBroadcast, onRoundComplete);
                    onBroadcast();
                    
                })

                onBroadcast(); // fifth event player choosing after player guessing for 25 seconds

            })
            onBroadcast(); // fourth event player guessing after player choosing for 20 seconds
        })

    }

    roundEnd() {

        console.log('Round has successfully ended');

        this.endGame();

    }

    endGame() {
        this.gameState = GameState.ENDED;
        console.log('game has successfully ended');
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
                    currentWord: this.currentWord,
                    // timer: this.timer,
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