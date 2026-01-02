/**
 * Main game controller handling players, turns, and game state.
 */
class Game {
  constructor() {
    this.canvas = document.getElementById("game-board");
    this.board = new GameBoard(this.canvas, this);
    this.cpuPlayer = new CPUPlayer(this);
    this.network = new NetworkManager(this);

    this.playerCount = 2;
    this.handSize = 6; // Fixed hand size
    this.players = [];
    this.playerNames = [];
    this.cpuPlayers = []; // Track which players are CPU
    this.currentPlayer = 0;
    this.selectedTile = null;
    this.tileBag = [];
    this.scores = [];
    this.gameStarted = false;
    this.gameMode = "local"; // 'local', 'host', 'join'

    // Initialize Firebase (optional - works offline if not available)
    this.network.init();

    this.setupUI();
    this.showSplashScreen();
  }

  setupUI() {
    // Game controls
    document
      .getElementById("new-game-btn")
      .addEventListener("click", () => this.showSetupModal());
    document
      .getElementById("pass-btn")
      .addEventListener("click", () => this.passTurn());
    document
      .getElementById("rotate-btn")
      .addEventListener("click", () => this.rotateSelectedTile());
    document.getElementById("play-again-btn").addEventListener("click", () => {
      document.getElementById("game-over-modal").classList.remove("show");
      this.showSetupModal();
    });

    // Language selector
    document
      .getElementById("setup-language")
      .addEventListener("change", (e) => {
        I18n.setLanguage(e.target.value);
        this.updateAllText();
        this.updateSetupPlayerInputs();
      });

    // Setup modal
    document
      .getElementById("setup-player-count")
      .addEventListener("change", (e) => {
        this.playerCount = parseInt(e.target.value);
        this.updateSetupPlayerInputs();
      });

    document.getElementById("start-game-btn").addEventListener("click", () => {
      this.startGameFromSetup();
    });

    // Game mode selection
    document.querySelectorAll('input[name="game-mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.onGameModeChanged(e.target.value);
      });
    });

    // Lobby controls
    document.getElementById("copy-code-btn")?.addEventListener("click", () => {
      this.copyRoomCode();
    });
    document
      .getElementById("leave-lobby-btn")
      ?.addEventListener("click", () => {
        this.leaveLobby();
      });
    document
      .getElementById("start-online-btn")
      ?.addEventListener("click", () => {
        this.startOnlineGame();
      });

    // Splash screen
    const splashScreen = document.getElementById("splash-screen");
    splashScreen.addEventListener("click", () => this.dismissSplash());

    // Turn announcement click to dismiss
    document
      .getElementById("turn-announcement")
      .addEventListener("click", () => {
        this.dismissTurnAnnouncement();
      });

    // ESC key to dismiss setup modal (only if game in progress)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const setupModal = document.getElementById("setup-modal");
        if (setupModal.classList.contains("show") && this.gameStarted) {
          setupModal.classList.remove("show");
        }
      }
    });
  }

  /**
   * Handle game mode selection change
   */
  onGameModeChanged(mode) {
    this.gameMode = mode;

    const joinGroup = document.getElementById("join-game-group");
    const nameGroup = document.getElementById("online-name-group");
    const playerCountGroup = document.getElementById("player-count-group");
    const playersGroup = document.getElementById("players-group");
    const startBtn = document.getElementById("start-game-btn");
    const errorEl = document.getElementById("online-error");

    // Hide error
    errorEl.style.display = "none";

    // Show/hide relevant sections
    if (mode === "local") {
      joinGroup.style.display = "none";
      nameGroup.style.display = "none";
      playerCountGroup.style.display = "block";
      playersGroup.style.display = "block";
      startBtn.textContent = I18n.t("startGame");
    } else if (mode === "host") {
      joinGroup.style.display = "none";
      nameGroup.style.display = "block";
      playerCountGroup.style.display = "block";
      playersGroup.style.display = "none";
      startBtn.textContent = I18n.t("createRoom");
    } else if (mode === "join") {
      joinGroup.style.display = "block";
      nameGroup.style.display = "block";
      playerCountGroup.style.display = "none";
      playersGroup.style.display = "none";
      startBtn.textContent = I18n.t("joinRoom");
    }
  }

  /**
   * Update all text elements with data-i18n attributes
   */
  updateAllText() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const paramsAttr = el.getAttribute("data-i18n-params");
      const params = paramsAttr ? JSON.parse(paramsAttr) : {};
      el.textContent = I18n.t(key, params);
    });

    // Update language selector to match current language
    const langSelect = document.getElementById("setup-language");
    if (langSelect) {
      langSelect.value = I18n.getCurrentLanguage();
    }
  }

  showSplashScreen() {
    const splash = document.getElementById("splash-screen");
    splash.classList.remove("hidden");

    // Auto-dismiss after 3 seconds
    this.splashTimeout = setTimeout(() => {
      this.dismissSplash();
    }, 3000);
  }

  dismissSplash() {
    if (this.splashTimeout) {
      clearTimeout(this.splashTimeout);
    }
    const splash = document.getElementById("splash-screen");
    splash.classList.add("hidden");

    // Show setup modal after splash
    setTimeout(() => {
      this.showSetupModal();
    }, 500);
  }

  showSetupModal() {
    // Reset to defaults
    document.getElementById("setup-player-count").value =
      this.playerCount.toString();
    document.getElementById("setup-language").value = I18n.getCurrentLanguage();

    // Reset game mode to local
    document.querySelector(
      'input[name="game-mode"][value="local"]'
    ).checked = true;
    this.gameMode = "local";
    this.onGameModeChanged("local");

    // Clear online inputs
    const roomCodeInput = document.getElementById("join-room-code");
    const nameInput = document.getElementById("online-player-name");
    if (roomCodeInput) roomCodeInput.value = "";
    if (nameInput) nameInput.value = "";

    // Hide any error
    document.getElementById("online-error").style.display = "none";

    this.updateAllText();
    this.updateSetupPlayerInputs();
    document.getElementById("setup-modal").classList.add("show");
  }

  updateSetupPlayerInputs() {
    const container = document.getElementById("setup-players-container");
    container.innerHTML = "";

    for (let i = 0; i < this.playerCount; i++) {
      const row = document.createElement("div");
      row.className = "setup-player-row";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = I18n.t("defaultPlayer", { n: i + 1 });
      input.value = this.playerNames[i] || "";
      input.dataset.playerIndex = i;

      const cpuLabel = document.createElement("label");
      cpuLabel.className = "cpu-toggle";

      const cpuCheckbox = document.createElement("input");
      cpuCheckbox.type = "checkbox";
      cpuCheckbox.checked = this.cpuPlayers[i] || false;
      cpuCheckbox.dataset.playerIndex = i;

      cpuLabel.appendChild(cpuCheckbox);
      cpuLabel.appendChild(document.createTextNode(I18n.t("cpu")));

      row.appendChild(input);
      row.appendChild(cpuLabel);
      container.appendChild(row);
    }
  }

  startGameFromSetup() {
    const errorEl = document.getElementById("online-error");
    errorEl.style.display = "none";

    if (this.gameMode === "local") {
      // Local game - existing logic
      this.startLocalGame();
    } else if (this.gameMode === "host") {
      // Host online game
      this.hostOnlineGame();
    } else if (this.gameMode === "join") {
      // Join online game
      this.joinOnlineGame();
    }
  }

  /**
   * Start a local (hotseat) game
   */
  startLocalGame() {
    // Read player count
    this.playerCount = parseInt(
      document.getElementById("setup-player-count").value
    );

    // Read names and CPU settings from setup inputs
    const nameInputs = document.querySelectorAll(
      "#setup-players-container input[type='text']"
    );
    const cpuCheckboxes = document.querySelectorAll(
      "#setup-players-container input[type='checkbox']"
    );

    this.playerNames = [];
    this.cpuPlayers = [];

    nameInputs.forEach((input, i) => {
      const isCPU = cpuCheckboxes[i]?.checked || false;
      this.cpuPlayers[i] = isCPU;
      // If CPU and no custom name, use "CPU 1", "CPU 2", etc.
      if (isCPU && !input.value.trim()) {
        this.playerNames[i] = I18n.t("defaultCPU", { n: i + 1 });
      } else {
        this.playerNames[i] =
          input.value.trim() || I18n.t("defaultPlayer", { n: i + 1 });
      }
    });

    // Hide setup modal
    document.getElementById("setup-modal").classList.remove("show");

    // Start the game
    this.newGame();
  }

  /**
   * Host an online game
   */
  async hostOnlineGame() {
    const errorEl = document.getElementById("online-error");

    if (!this.network.isAvailable()) {
      errorEl.textContent = I18n.t("firebaseNotAvailable");
      errorEl.style.display = "block";
      return;
    }

    const playerName =
      document.getElementById("online-player-name").value.trim() ||
      I18n.t("defaultPlayer", { n: 1 });
    this.playerCount = parseInt(
      document.getElementById("setup-player-count").value
    );

    try {
      const roomCode = await this.network.hostGame(
        playerName,
        this.playerCount
      );

      // Hide setup, show lobby
      document.getElementById("setup-modal").classList.remove("show");
      this.showLobby(roomCode);
    } catch (error) {
      console.error("Failed to host game:", error);
      errorEl.textContent = I18n.t("failedToHost");
      errorEl.style.display = "block";
    }
  }

  /**
   * Join an online game
   */
  async joinOnlineGame() {
    const errorEl = document.getElementById("online-error");

    if (!this.network.isAvailable()) {
      errorEl.textContent = I18n.t("firebaseNotAvailable");
      errorEl.style.display = "block";
      return;
    }

    const roomCode = document.getElementById("join-room-code").value.trim();
    const playerName =
      document.getElementById("online-player-name").value.trim() ||
      I18n.t("defaultPlayer", { n: 2 });

    if (!roomCode || roomCode.length < 4) {
      errorEl.textContent = I18n.t("enterValidCode");
      errorEl.style.display = "block";
      return;
    }

    try {
      await this.network.joinGame(roomCode, playerName);

      // Hide setup, show lobby
      document.getElementById("setup-modal").classList.remove("show");
      this.showLobby(roomCode);
    } catch (error) {
      console.error("Failed to join game:", error);
      const errorKey = error.message || "failedToJoin";
      errorEl.textContent = I18n.t(errorKey);
      errorEl.style.display = "block";
    }
  }

  /**
   * Show the lobby modal
   */
  showLobby(roomCode) {
    document.getElementById("lobby-room-code").textContent = roomCode;
    this.updateLobbyPlayers();
    document.getElementById("lobby-modal").classList.add("show");
  }

  /**
   * Update lobby player list
   */
  updateLobbyPlayers() {
    const container = document.getElementById("lobby-players");
    const statusEl = document.getElementById("lobby-status");
    const startBtn = document.getElementById("start-online-btn");

    container.innerHTML = "";

    const players = this.network.getConnectedPlayersList();
    const expectedCount = this.playerCount;

    // Create slots for all expected players
    for (let i = 0; i < expectedCount; i++) {
      const player = players.find((p) => p.slot === i);
      const slot = document.createElement("div");
      slot.className = `lobby-player-slot ${player ? "filled" : "waiting"}`;

      const icon = document.createElement("span");
      icon.className = "slot-icon";
      icon.textContent = player ? "👤" : "⏳";

      const name = document.createElement("span");
      name.className = "slot-name";
      name.textContent = player ? player.name : I18n.t("waitingForPlayer");

      slot.appendChild(icon);
      slot.appendChild(name);

      // Mark if this is the current player
      if (
        player &&
        this.network.playerId &&
        this.network.connectedPlayers.get(this.network.playerId)?.slot === i
      ) {
        const youTag = document.createElement("span");
        youTag.className = "slot-you";
        youTag.textContent = I18n.t("you");
        slot.appendChild(youTag);
      }

      container.appendChild(slot);
    }

    // Update status and start button
    const connectedCount = players.length;
    const isReady = connectedCount >= expectedCount;

    if (isReady) {
      statusEl.textContent = I18n.t("allPlayersReady");
      statusEl.classList.add("ready");
    } else {
      statusEl.textContent = I18n.t("waitingForMore", {
        current: connectedCount,
        total: expectedCount,
      });
      statusEl.classList.remove("ready");
    }

    // Only host can start, and only when ready
    startBtn.disabled = !this.network.isHost || !isReady;
    startBtn.style.display = this.network.isHost ? "block" : "none";
  }

  /**
   * Copy room code to clipboard
   */
  async copyRoomCode() {
    const code = document.getElementById("lobby-room-code").textContent;
    try {
      await navigator.clipboard.writeText(code);
      this.showMessage(I18n.t("codeCopied"));
    } catch (e) {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      this.showMessage(I18n.t("codeCopied"));
    }
  }

  /**
   * Leave the lobby
   */
  async leaveLobby() {
    await this.network.leaveGame();
    document.getElementById("lobby-modal").classList.remove("show");
    this.showSetupModal();
  }

  /**
   * Start the online game (host only)
   */
  async startOnlineGame() {
    if (!this.network.isHost) return;

    // Set up player names from lobby
    const players = this.network.getConnectedPlayersList();
    this.playerNames = [];
    this.cpuPlayers = [];

    for (let i = 0; i < this.playerCount; i++) {
      const player = players.find((p) => p.slot === i);
      this.playerNames[i] =
        player?.name || I18n.t("defaultPlayer", { n: i + 1 });
      this.cpuPlayers[i] = false; // No CPU in online games
    }

    // Hide lobby
    document.getElementById("lobby-modal").classList.remove("show");

    // Initialize game
    this.newGame();

    // Broadcast initial state to all players
    const state = this.serializeState();
    await this.network.startOnlineGame(state);
  }

  /**
   * Called when an online game starts (for non-host players)
   */
  onOnlineGameStarted() {
    document.getElementById("lobby-modal").classList.remove("show");
    // State will be applied via applyRemoteState
  }

  /**
   * Called when a player joins the lobby
   */
  onPlayerJoined(playerData) {
    this.updateLobbyPlayers();
    if (document.getElementById("lobby-modal").classList.contains("show")) {
      this.showMessage(I18n.t("playerJoined", { name: playerData.name }));
    }
  }

  /**
   * Called when a player's status updates
   */
  onPlayerUpdated(playerData) {
    this.updateLobbyPlayers();
  }

  /**
   * Called when a player leaves
   */
  onPlayerLeft(playerData) {
    this.updateLobbyPlayers();
    if (playerData) {
      this.showMessage(I18n.t("playerLeft", { name: playerData.name }), true);
    }
  }

  getPlayerName(index) {
    return this.playerNames[index] || I18n.t("defaultPlayer", { n: index + 1 });
  }

  isCurrentPlayerCPU() {
    return this.cpuPlayers[this.currentPlayer] === true;
  }

  newGame() {
    this.board.clear();
    this.currentPlayer = 0;
    this.selectedTile = null;
    this.scores = Array(this.playerCount).fill(0);
    this.gameStarted = true;
    this.cpuPlayer.setThinking(false);

    // Initialize player names if not set
    for (let i = 0; i < this.playerCount; i++) {
      if (!this.playerNames[i]) {
        this.playerNames[i] = I18n.t("defaultPlayer", { n: i + 1 });
      }
    }

    // Create tile bag
    this.createTileBag();

    // Deal hands
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push([]);
      this.drawTiles(i, this.handSize);
    }

    // Place a random starting tile in the center
    const startingTile = new Triangle();
    this.board.placeTile(0, 0, startingTile);

    this.updateUI();

    // Show first player's turn announcement
    this.showTurnAnnouncement(this.getPlayerName(0), () => {
      // After announcement, check if first player is CPU
      if (this.isCurrentPlayerCPU()) {
        this.cpuPlayer.scheduleTurn((bestMove) => {
          this.placeTileDirectly(
            bestMove.tileIndex,
            bestMove.row,
            bestMove.col,
            bestMove.rotation
          );
        });
      }
    });
  }

  createTileBag() {
    this.tileBag = [];
    // Create a good variety of tiles
    for (let i = 0; i < 100; i++) {
      this.tileBag.push(new Triangle());
    }
    // Shuffle
    for (let i = this.tileBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tileBag[i], this.tileBag[j]] = [this.tileBag[j], this.tileBag[i]];
    }
  }

  drawTiles(playerIndex, count) {
    for (let i = 0; i < count && this.tileBag.length > 0; i++) {
      this.players[playerIndex].push(this.tileBag.pop());
    }
  }

  getCurrentPlayerHand() {
    return this.players[this.currentPlayer];
  }

  selectTile(index) {
    // Don't allow selection if CPU is playing (local mode)
    if (!this.network.isOnline && this.isCurrentPlayerCPU()) return;

    // Don't allow selection if it's not our turn (online mode)
    if (this.network.isOnline && !this.isMyTurn()) return;

    if (this.selectedTile === index) {
      this.selectedTile = null;
    } else {
      this.selectedTile = index;
    }
    this.renderHand();
    this.board.render();

    document.getElementById("rotate-btn").disabled = this.selectedTile === null;
  }

  rotateSelectedTile() {
    if (this.selectedTile !== null) {
      const hand = this.getCurrentPlayerHand();
      hand[this.selectedTile].rotate();
      this.renderHand();
      this.board.render();
    }
  }

  attemptPlacement(row, col) {
    if (this.selectedTile === null) return;

    // In online mode, check if it's our turn
    if (this.network.isOnline && !this.isMyTurn()) {
      this.showMessage(I18n.t("notYourTurn"), true);
      return;
    }

    const hand = this.getCurrentPlayerHand();
    const triangle = hand[this.selectedTile];
    const result = this.board.canPlace(row, col, triangle);

    if (result.valid) {
      // Calculate score (number of matching sides)
      const matchingSides = this.board.countMatchingSides(row, col);
      const points = matchingSides * 10; // 10 points per matched side
      this.scores[this.currentPlayer] += points;

      // Place tile
      this.board.placeTile(row, col, triangle);

      // Remove from hand (don't draw replacement - only draw when passing)
      hand.splice(this.selectedTile, 1);
      this.selectedTile = null;

      // Check for game over (current player has no tiles)
      if (this.checkGameOver()) {
        this.endGame();
        this.broadcastState(); // Broadcast final state
      } else {
        this.showMessage(I18n.t("pointsScored", { n: points }));
        this.nextTurn();
        this.broadcastState(); // Broadcast state after turn
      }
    } else {
      this.showMessage(result.reason, true);
    }
  }

  // CPU-specific placement (bypasses selection)
  placeTileDirectly(tileIndex, row, col, rotation) {
    const hand = this.getCurrentPlayerHand();
    const triangle = hand[tileIndex];

    // Set rotation
    triangle.rotation = rotation;

    // Calculate score
    const matchingSides = this.board.countMatchingSides(row, col);
    const points = matchingSides * 10;
    this.scores[this.currentPlayer] += points;

    // Place tile
    this.board.placeTile(row, col, triangle);

    // Remove from hand
    hand.splice(tileIndex, 1);

    this.updateUI();
    this.board.render();

    // Check for game over
    if (this.checkGameOver()) {
      this.endGame();
    } else {
      this.showMessage(I18n.t("pointsScored", { n: points }));
      this.nextTurn();
    }
  }

  passTurn() {
    // Don't allow manual pass if CPU is playing
    if (this.isCurrentPlayerCPU() && !this.cpuPlayer.isThinking()) return;

    // In online mode, check if it's our turn
    if (this.network.isOnline && !this.isMyTurn()) {
      return;
    }

    const currentName = this.getPlayerName(this.currentPlayer);

    // Draw a new tile when passing
    if (this.tileBag.length > 0) {
      this.drawTiles(this.currentPlayer, 1);
      this.showMessage(I18n.t("passedAndDrew", { name: currentName }));
    } else {
      this.showMessage(I18n.t("passedNoDraw", { name: currentName }));
    }

    this.selectedTile = null;

    // Check if game should end (player has no tiles after failing to draw)
    if (this.checkGameOver()) {
      this.endGame();
      this.broadcastState(); // Broadcast final state
    } else {
      this.nextTurn();
      this.broadcastState(); // Broadcast state after turn
    }
  }

  nextTurn() {
    this.currentPlayer = (this.currentPlayer + 1) % this.playerCount;
    this.selectedTile = null;
    this.cpuPlayer.setThinking(false);
    document.getElementById("rotate-btn").disabled = true;

    // Disable pass button if CPU's turn or not our turn in online mode
    const disablePass = this.network.isOnline
      ? !this.isMyTurn()
      : this.isCurrentPlayerCPU();
    document.getElementById("pass-btn").disabled = disablePass;

    this.updateUI();
    this.board.render();

    // Show turn announcement
    this.showTurnAnnouncement(this.getPlayerName(this.currentPlayer), () => {
      // After announcement, check if current player is CPU (local mode only)
      if (!this.network.isOnline && this.isCurrentPlayerCPU()) {
        this.cpuPlayer.scheduleTurn((bestMove) => {
          this.placeTileDirectly(
            bestMove.tileIndex,
            bestMove.row,
            bestMove.col,
            bestMove.rotation
          );
        });
      }
    });
  }

  showTurnAnnouncement(playerName, callback) {
    const announcement = document.getElementById("turn-announcement");
    const text = document.getElementById("turn-text");

    text.textContent = I18n.t("playerTurn", { name: playerName });
    text.style.color = PLAYER_COLORS[this.currentPlayer];
    announcement.classList.add("show");

    // Auto-dismiss after 1.5 seconds (shorter for CPU)
    const isCPU = this.isCurrentPlayerCPU();
    const duration = isCPU ? 1000 : 1500;
    this.turnAnnouncementTimeout = setTimeout(() => {
      this.dismissTurnAnnouncement();
      if (callback) callback();
    }, duration);
  }

  dismissTurnAnnouncement() {
    if (this.turnAnnouncementTimeout) {
      clearTimeout(this.turnAnnouncementTimeout);
    }
    document.getElementById("turn-announcement").classList.remove("show");
  }

  checkGameOver() {
    // Game ends when any player has no tiles left
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].length === 0) {
        return true;
      }
    }
    return false;
  }

  canCurrentPlayerPlay() {
    const hand = this.getCurrentPlayerHand();
    for (const tile of hand) {
      const placements = this.board.getValidPlacements(tile);
      if (placements.length > 0) return true;
    }
    return false;
  }

  endGame() {
    this.gameStarted = false;
    const maxScore = Math.max(...this.scores);
    const winners = this.scores
      .map((score, index) => ({ score, index }))
      .filter((p) => p.score === maxScore);

    let winnerText;
    if (winners.length > 1) {
      winnerText = I18n.t("itsATie");
    } else {
      winnerText = I18n.t("playerWins", {
        name: this.getPlayerName(winners[0].index),
      });
    }

    document.getElementById("winner-text").textContent = winnerText;

    const scoresHtml = this.scores
      .map((score, i) => {
        const isWinner = score === maxScore;
        const isCPU = this.cpuPlayers[i];
        return `<div class="score-row ${isWinner ? "winner-row" : ""}">
                <span>${this.getPlayerName(i)}${
          isCPU ? I18n.t("cpuSuffix") : ""
        }</span>
                <span>${I18n.t("nPoints", { n: score })}</span>
            </div>`;
      })
      .join("");

    document.getElementById("final-scores").innerHTML = scoresHtml;
    document.getElementById("game-over-modal").classList.add("show");
  }

  updateUI() {
    // Update current player display
    const playerName = document.getElementById("current-player");
    const isCPU = this.cpuPlayers[this.currentPlayer];
    playerName.textContent =
      this.getPlayerName(this.currentPlayer) +
      (isCPU ? I18n.t("cpuSuffix") : "");
    playerName.style.color = PLAYER_COLORS[this.currentPlayer];

    // Update scores
    this.updateScoreBoard();

    // Render hand
    this.renderHand();
  }

  updateScoreBoard() {
    const scoreBoard = document.querySelector(".score-board");
    scoreBoard.innerHTML = this.scores
      .map(
        (score, i) => `
            <div class="score" ${
              i === this.currentPlayer
                ? 'style="opacity: 1"'
                : 'style="opacity: 0.6"'
            }>
                <span class="player-dot" style="--dot-color: ${
                  PLAYER_COLORS[i]
                }"></span>
                <span>${this.getPlayerName(i).substring(
                  0,
                  8
                )}: <strong>${score}</strong></span>
            </div>
        `
      )
      .join("");
  }

  renderHand() {
    const container = document.getElementById("hand-tiles");

    // In online mode, always show your own hand
    let hand;

    if (this.network.isOnline) {
      const mySlot = this.network.getMySlot();
      hand = this.players[mySlot];
    } else {
      hand = this.getCurrentPlayerHand();
    }

    container.innerHTML = "";

    if (!hand) return;

    // If CPU player (local mode only), show cards face down
    const isCPU = !this.network.isOnline && this.isCurrentPlayerCPU();

    // Determine if interaction should be enabled
    const canInteract = this.network.isOnline ? this.isMyTurn() : !isCPU;

    hand.forEach((triangle, index) => {
      const svg = TileRenderer.createHandTileSVG(
        triangle,
        index === this.selectedTile && canInteract,
        isCPU
      );
      if (canInteract) {
        svg.addEventListener("click", () => this.selectTile(index));
        // Right-click to rotate on hand tiles
        svg.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.selectTile(index);
          this.rotateSelectedTile();
        });
      }
      container.appendChild(svg);
    });
  }

  showMessage(text, isError = false) {
    const msg = document.getElementById("game-message");
    msg.textContent = text;
    msg.style.borderColor = isError ? "#ff6b6b" : "#00f5d4";
    msg.style.color = isError ? "#ff6b6b" : "#00f5d4";
    msg.classList.add("show");

    setTimeout(() => {
      msg.classList.remove("show");
    }, 2500);
  }

  // ================================
  // Serialization for Online Play
  // ================================

  /**
   * Serialize the complete game state for network transmission
   */
  serializeState() {
    return {
      currentPlayer: this.currentPlayer,
      scores: [...this.scores],
      playerNames: [...this.playerNames],
      playerCount: this.playerCount,
      tileBag: this.tileBag.map((t) => this.serializeTile(t)),
      board: this.serializeBoard(),
      hands: this.players.map((hand) => hand.map((t) => this.serializeTile(t))),
      gameStarted: this.gameStarted,
    };
  }

  /**
   * Serialize a single triangle tile
   */
  serializeTile(triangle) {
    return {
      sides: triangle.sides.map((s) => ({ value: s.value, color: s.color })),
      rotation: triangle.rotation,
    };
  }

  /**
   * Serialize the board state
   */
  serializeBoard() {
    const boardData = {};
    for (const [key, tile] of this.board.tiles) {
      boardData[key] = {
        triangle: this.serializeTile(tile.triangle),
        pointsUp: tile.pointsUp,
      };
    }
    return boardData;
  }

  /**
   * Deserialize a triangle tile
   */
  deserializeTile(data) {
    const t = new Triangle(
      data.sides.map((s) => ({ value: s.value, color: s.color }))
    );
    t.rotation = data.rotation;
    return t;
  }

  /**
   * Apply state received from the network
   */
  applyRemoteState(state) {
    // Update game state
    this.currentPlayer = state.currentPlayer;
    this.scores = [...state.scores];
    this.playerNames = [...state.playerNames];
    this.playerCount = state.playerCount;
    this.gameStarted = state.gameStarted;

    // Restore tile bag
    this.tileBag = state.tileBag.map((t) => this.deserializeTile(t));

    // Restore board
    this.board.tiles.clear();
    for (const [key, tileData] of Object.entries(state.board)) {
      const [row, col] = key.split(",").map(Number);
      const triangle = this.deserializeTile(tileData.triangle);
      this.board.tiles.set(key, {
        triangle,
        pointsUp: tileData.pointsUp,
      });
    }

    // Restore hands
    this.players = state.hands.map((hand) =>
      hand.map((t) => this.deserializeTile(t))
    );

    // Reset selection
    this.selectedTile = null;

    // Update button states for online mode
    document.getElementById("rotate-btn").disabled = true;
    document.getElementById("pass-btn").disabled = !this.isMyTurn();

    // Update UI
    this.updateUI();
    this.board.render();

    // Show turn announcement if it's now our turn
    if (this.isMyTurn()) {
      this.showMessage(
        I18n.t("playerTurn", { name: this.getPlayerName(this.currentPlayer) })
      );
    }

    // Check if game is over
    if (this.checkGameOver()) {
      this.endGame();
    }
  }

  /**
   * Check if it's this player's turn in online mode
   */
  isMyTurn() {
    if (!this.network.isOnline) return true;
    return this.currentPlayer === this.network.getMySlot();
  }

  /**
   * Broadcast current state to other players
   */
  async broadcastState() {
    if (this.network.isOnline) {
      const state = this.serializeState();
      await this.network.sendAction("state", state);
    }
  }
}
