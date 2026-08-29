# Scribble

Scribble is a multiplayer drawing and guessing game where one player takes on the role of the artist while others attempt to guess the word being illustrated. Players compete to correctly identify what the drawer is creating on the canvas.

Each correct guess earns points for the guesser. After 3 rounds of drawing and guessing, the game concludes and the top 3 players with the highest scores are declared the winners.

I developed this game independently as a solo project. I got interests in multiplayer game development.

The game is built using WebSocket connections for real-time communication between players. It implements a state machine architecture where the game starts in START state and then WAITING -> CHOOSING -> GUESSING -> HIDDEN WORD -> CHOOSING -> GUESSING -> HIDDEN WORD till all the rounds given by the creator of the room ends, ending with the END state.


Design Doc Link -> 

https://docs.google.com/document/d/e/2PACX-1vSZbcp7qO29QDEEB4DP9EBbKTp_CwjaZBN1Lf8nY_Vkuhn3PUaYuzfblMBUCksPrLPNRYBqd1L6YIJo/pub