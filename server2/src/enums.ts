export enum GameState {
    WAITING = 'waiting',
    PLAYER_CHOOSING = 'player_choosing',
    PLAYER_GUESSING = 'player_guessing',
    // every time guessing state ends, reset the canvas
    HIDDEN_WORD='hidden_word',
    ENDED = 'ended'
}


export enum GameMode {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD'
}