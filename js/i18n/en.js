/**
 * English language strings
 */
const LANG_EN = {
  // Splash screen
  splashSubtitle: "Triangle Tile Game",
  splashRules: "Match Colors • Sum to Ten",
  splashHint: "Click anywhere to continue",

  // Setup modal
  gameSetup: "Game Setup",
  numberOfPlayers: "Number of Players",
  players: "Players",
  nPlayers: "{n} Players",
  startGame: "Start Game",
  cpu: "CPU",

  // Game mode
  gameMode: "Game Mode",
  localMode: "Local (Hotseat)",
  hostOnline: "Host Online Game",
  joinOnline: "Join Online Game",
  roomCode: "Room Code",
  yourName: "Your Name",
  createRoom: "Create Room",
  joinRoom: "Join Room",

  // Lobby
  waitingForPlayers: "Waiting for Players",
  roomCodeLabel: "Room Code:",
  copy: "Copy",
  leave: "Leave",
  waitingForPlayer: "Waiting for player...",
  you: "You",
  allPlayersReady: "All players ready!",
  waitingForMore: "Waiting for players ({current}/{total})...",
  codeCopied: "Room code copied!",
  playerJoined: "{name} joined the game",
  playerLeft: "{name} left the game",

  // Online errors
  firebaseNotAvailable: "Online mode not available. Check your connection.",
  failedToHost: "Failed to create room. Please try again.",
  failedToJoin: "Failed to join room. Please try again.",
  roomNotFound: "Room not found. Check the code and try again.",
  gameAlreadyStarted: "This game has already started.",
  roomFull: "This room is full.",
  enterValidCode: "Please enter a valid room code.",
  notYourTurn: "It's not your turn!",

  // Game info
  currentPlayer: "Current Player",
  newGame: "New Game",

  // Player hand
  yourHand: "Your Hand",
  rotate: "Rotate",
  pass: "Pass",
  rightClickHint: "Right-click to rotate",

  // Game over modal
  gameOver: "Game Over!",
  playAgain: "Play Again",
  itsATie: "It's a tie!",
  playerWins: "{name} wins!",
  nPoints: "{n} points",

  // Default names
  defaultPlayer: "Player {n}",
  defaultCPU: "CPU {n}",
  cpuSuffix: " (CPU)",

  // Game messages
  pointsScored: "+{n} points!",
  passedAndDrew: "{name} passed and drew a tile",
  passedNoDraw: "{name} passed (no tiles left to draw)",
  playerTurn: "{name}'s Turn",

  // Placement errors
  cellOccupied: "Cell occupied",
  colorsDontMatch: "Colors don't match ({color1} vs {color2})",
  sumNotTen: "Sum is {sum}, not 10",
  mustBeAdjacent: "Must be adjacent to existing tile",
};
