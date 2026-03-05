export default class Game {

    private players;
    private guessWords;
    private winners;
    private currentWord;
    private guessers;
    private drawer;
    private scoreBoard;
    private timer;
    private round;

    constructor() {
        this.players = {}
        this.guessWords = []
        this.winners = []
        this.currentWord = null
        this.guessers = []
        this.drawer = null
        this.scoreBoard = {}
        this.timer = 120
        this.round = Array(3).fill(0)
    }





}


// players
// words
// currentWord
// 