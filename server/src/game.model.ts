import words from "./words";

export enum GameState {
    WAITING = 'waiting',
    PLAYER_CHOOSING = 'player_choosing',
    PLAYER_GUESSING = 'player_guessing',
    HIDDEN_WORD='hidden_word',
    ENDED = 'ended'
}

interface ScoreEntry {
  player: string;
  time: number;
}


export default class Game {

    scoreBoard: Map<string, number> = new Map<string, number>();
    canvasSnapshot: any[] = [];
    players: string[];
    guessWords: string[];
    winnerStack: [];
    currentWord: string;
    guessers: string[];
    drawer: string;
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
    userIsDrawing: (() => void) | null;
    displayWord: (() => void) | null;
    timerScoreCard: ScoreEntry[] = [];
    maxPlayers: number;
    maxRounds: number;

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
        this.userIsDrawing = null
        this.displayWord = null;
        this.timerScoreCard = []
        this.canvasSnapshot = [];
        this.maxPlayers = 5;
        this.maxRounds = 3;
    }


    startGame() {
        this.gameState = GameState.WAITING;
    }


    setGameSettings(maxNoOfPlayers: number, drawTimer: number, maxRounds: number) {
        this.maxPlayers = maxNoOfPlayers;
        this.maxRounds = maxRounds;
        this.guessingTime = drawTimer;
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

        if(this.players.length == this.maxPlayers){
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

        this.gameState = GameState.PLAYER_CHOOSING;

        this.playerIdx = this.players.length - 1;

        this.playerSelectWord(() => {
            onComplete();
        });

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
        }, this.choosingTime)

        this.completeChooseAction = () => {
            if(isDone) return;
            isDone = true;

            this.gameState = GameState.PLAYER_GUESSING;

            if(this.chooseTimer) clearTimeout(this.chooseTimer);
            onCompleteSelect()
        }

    }


    // player Guessed Scenario: 
    // after the player chooses the word
    // the guessers have to guess the word
    // this will work until the timer runs out or all players have guessed the word

    startGuessingPhase(onCompleteGuessed: (() => void), displayWordAfterHiddenState: (() => void)){

        let isDone = false;

        this.timerStartedAt = Date.now();

        this.guessTimer  = setTimeout(() => {
            if(isDone) return;
            isDone = true;

            this.gameState = GameState.HIDDEN_WORD;
            
            onCompleteGuessed();
            displayWordAfterHiddenState()
        }, this.guessingTime);

        this.completeGuessAction = () => {
            if(isDone) return;
            isDone = true;

            this.gameState = GameState.HIDDEN_WORD;

            if(this.guessTimer) clearTimeout(this.guessTimer);
            onCompleteGuessed();
        }

    }

    checkGuess(word: string, player: string, onCorrectGuess:() => void, onCloseGuess: () => void, sendChat: () => void){


        if(word === this.currentWord && this.guessers.includes(player) && !this.correctGuesses.get(player)) {

            const timeOfGuess: number = this.getTimeinMS(this.guessingTime);

            this.timerScoreCard.push({ player: player, time: timeOfGuess });

            
            this.correctGuesses.set(player, true);
            onCorrectGuess();


            return;
            // this.playerScored();

        }

        // console.log("return works and everything after this gets called")

        if(word.length == this.currentWord.length){
            let count = 0;
            for(let i = 0; i < word.length; i++){
                if(word[i] != this.currentWord[i]){
                    count++;
                }
            }

            if(count == 1) {
                onCloseGuess();
            }

            return;

        }

        console.log("return works and everything after this gets called")

        sendChat()

    }


    showHiddenWord(onCompleteHiddenWord: () => void){


        this.revealWordTimer = setTimeout(() => {
            this.gameState = GameState.PLAYER_CHOOSING;
            onCompleteHiddenWord();
        }, 3000)
        
    }


    wordSelected(word: any) {

        this.currentWord = word;
        this.gameState = GameState.PLAYER_GUESSING;

    }

    checkIfAllHasGuessed(): boolean{
        let endState = true;

        for (const [key, value] of this.correctGuesses){
            endState = endState && value
        }


        if(endState){
            this.completeGuessAction?.()
            return true;
        }

        return false

    }

    // recursion function that will on break once a single round has 
    nextTurn(onBroadcast: () => void, onRoundComplete: () => void, displayWordAfterHiddenState: () => void, displayDrawerAfterChoosing: () => void){


        this.playerIdx -= 1;
        this.drawer = '';
        this.currentWord = '';
        this.correctGuesses = new Map<string, boolean>(this.guessers.map(key => [key, false]));
        this.canvasSnapshot = [];
        // this.gameState = GameState.PLAYER_CHOOSING;
        if(this.chooseTimer) { clearTimeout(this.chooseTimer); this.chooseTimer = undefined; }
        if(this.guessTimer) { clearTimeout(this.guessTimer); this.guessTimer = undefined; }



        if(this.playerIdx < 0){
            if(this.round == this.maxRounds){
                onRoundComplete();
                return;
            }
            this.playerIdx = this.players.length - 1;
            this.round += 1;
        }

        this.playerSelectWord(() => {
            this.startGuessingPhase(
                () => {

                    this.showHiddenWord(() => {

                        this.nextTurn(onBroadcast, onRoundComplete, displayWordAfterHiddenState, displayDrawerAfterChoosing);
                        onBroadcast();
                        
                    })

                    this.markPlayerScores();
                    onBroadcast(); // fifth event player choosing after player guessing for 25 seconds

                },
                () => {
                    displayWordAfterHiddenState()
                }
            )
                displayDrawerAfterChoosing();
                onBroadcast(); // fourth event player guessing after player choosing for 20 seconds
            }
        )

    }

    roundEnd() {


        this.endGame();

    }

    endGame() {        

        this.gameState = GameState.ENDED;

        const topThree = this.getTop3Players();


    }

    getTimeinSeconds(timerDuration: number) {

        if(!this.timerStartedAt) return 0;

        const elapsed = Date.now() - this.timerStartedAt;
        const remainingTime = timerDuration - elapsed;

        return Math.max(0, Math.floor(remainingTime / 1000));

    }

    getTimeinMS(timerDuration: number){

        if(!this.timerStartedAt) return 0;
        
        const elapsed = Date.now() - this.timerStartedAt;
        const remainingTime = timerDuration - elapsed;

        return remainingTime;
    }


    markPlayerScores() {
        const basePoints = 100;
        const rankDecrement = 10; // 1st: 100, 2nd: 90, 3rd: 80...
        const timeBonusWeight = 20; // max bonus points available for speed

        this.timerScoreCard.forEach(({player, time}, index) => {
            const rankScore = Math.max(basePoints - index * rankDecrement, 0);
            const timeBonus = Math.round((time / this.guessingTime) * timeBonusWeight);
            const totalScore = rankScore + timeBonus;

            const prevScore = this.scoreBoard.get(player) ?? 0;
            this.scoreBoard.set(player, prevScore + totalScore);
        });

        this.timerScoreCard = [];
    }

    getTop3Players(): [string, number][] {
        return Array.from(this.scoreBoard.entries())
        .sort((a, b) => b[1] - a[1]) 
        .slice(0, 3);
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
                    timeLeft: this.getTimeinSeconds(this.choosingTime)
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
                    timeLeft: this.getTimeinSeconds(this.guessingTime)
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
                    timeLeft: this.getTimeinSeconds(3000)
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