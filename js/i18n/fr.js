/**
 * French language strings
 */
const LANG_FR = {
  // Splash screen
  splashSubtitle: "Jeu de Tuiles Triangulaires",
  splashRules: "Associer les Couleurs • Somme de Dix",
  splashHint: "Cliquez n'importe où pour continuer",

  // Setup modal
  gameSetup: "Configuration",
  numberOfPlayers: "Nombre de Joueurs",
  players: "Joueurs",
  nPlayers: "{n} Joueurs",
  startGame: "Commencer",
  cpu: "Ordi",

  // Game mode
  gameMode: "Mode de Jeu",
  localMode: "Local (Même écran)",
  hostOnline: "Héberger une Partie",
  joinOnline: "Rejoindre une Partie",
  roomCode: "Code de la Salle",
  yourName: "Votre Nom",
  createRoom: "Créer la Salle",
  joinRoom: "Rejoindre",

  // Lobby
  waitingForPlayers: "En Attente des Joueurs",
  roomCodeLabel: "Code de Salle:",
  copy: "Copier",
  leave: "Quitter",
  waitingForPlayer: "En attente d'un joueur...",
  you: "Vous",
  allPlayersReady: "Tous les joueurs sont prêts!",
  waitingForMore: "En attente de joueurs ({current}/{total})...",
  codeCopied: "Code copié!",
  playerJoined: "{name} a rejoint la partie",
  playerLeft: "{name} a quitté la partie",

  // Online errors
  connectingToServer: "Connexion au serveur... Veuillez patienter.",
  firebaseNotAvailable:
    "Mode en ligne non disponible. Vérifiez votre connexion.",
  failedToHost: "Échec de création de la salle. Réessayez.",
  failedToJoin: "Échec de connexion. Réessayez.",
  roomNotFound: "Salle introuvable. Vérifiez le code.",
  gameAlreadyStarted: "Cette partie a déjà commencé.",
  roomFull: "Cette salle est pleine.",
  enterValidCode: "Veuillez entrer un code valide.",
  notYourTurn: "Ce n'est pas votre tour!",

  // Game info
  currentPlayer: "Joueur Actuel",
  newGame: "Nouvelle Partie",

  // Player hand
  yourHand: "Votre Main",
  rotate: "Tourner",
  pass: "Passer",
  rightClickHint:
    "Clic droit pour tourner • Espace pour passer • Glisser pour déplacer",

  // Game over modal
  gameOver: "Partie Terminée!",
  playAgain: "Rejouer",
  itsATie: "Égalité!",
  playerWins: "{name} gagne!",
  nPoints: "{n} points",

  // Default names
  defaultPlayer: "Joueur {n}",
  defaultCPU: "Ordi {n}",
  cpuSuffix: " (Ordi)",

  // Game messages
  pointsScored: "+{n} points!",
  passedAndDrew: "{name} a passé et pioché une tuile",
  passedNoDraw: "{name} a passé (plus de tuiles)",
  playerTurn: "Tour de {name}",

  // Placement errors
  cellOccupied: "Case occupée",
  colorsDontMatch: "Couleurs différentes ({color1} vs {color2})",
  sumNotTen: "Somme de {sum}, pas 10",
  mustBeAdjacent: "Doit être adjacent à une tuile existante",
};
