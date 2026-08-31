# Scrabble

Scrabble is a multiplayer drawing and guessing game where one player takes on the role of the artist while others attempt to guess the word being illustrated. Players compete to correctly identify what the drawer is creating on the canvas.

Each correct guess earns points for the guesser. After 3 (less or more) rounds of drawing and guessing, the game concludes and the top 3 players with the highest scores are declared the winners.

I developed this game independently as a solo project. I got interests in multiplayer game development.

The game is built using WebSocket connections for real-time communication between players. It implements a state machine architecture where the game starts in START state and then WAITING -> CHOOSING -> GUESSING -> HIDDEN WORD -> CHOOSING -> GUESSING -> HIDDEN WORD till all the rounds given by the creator of the room ends, ending with the END state.


There are two main branches in this repository: 
1. main
2. pubsub

The First one is a straight forward Game Application, nothing interesting here, you can straight up clone the repo and play, beware!! you need at least 2 people for a game to start. 

The second one is interesting, it is a proposed solution for my Game, if I (Hypothetically) gain hundreds of thousands of players overnight (which is never gonna happen).
How would I make my Game scalable? How would I design the architecture? how would I address some problems? 

all of that is given in the following design doc, be sure to read it ;)


Design Doc Link -> 

https://docs.google.com/document/d/e/2PACX-1vSZbcp7qO29QDEEB4DP9EBbKTp_CwjaZBN1Lf8nY_Vkuhn3PUaYuzfblMBUCksPrLPNRYBqd1L6YIJo/pub
