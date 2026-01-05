/**
 * Online Game Extension - Adds multiplayer functionality to the Game class.
 * This is a mixin that extends Game with online capabilities while keeping
 * the base Game class focused on core local game logic.
 *
 * Usage: Call OnlineGameExtension.apply(game) after creating a Game instance.
 */
const OnlineGameExtension = {
  /**
   * Apply the online extension to a Game instance
   * @param {Game} game - The game instance to extend
   */
  apply(game) {
    // Add online-specific state
    game.gameMode = "local"; // 'local', 'host', 'join'
    game.networkInitializing = true;

    // Create network manager
    game.network = new NetworkManager(game);

    // Initialize Firebase asynchronously (includes authentication)
    // This runs in the background - isAvailable() will return false until ready
    game.network
      .init()
      .then((success) => {
        game.networkInitializing = false;
        if (success) {
          console.log("Online multiplayer ready");
        } else {
          console.log("Online multiplayer not available");
        }
      })
      .catch((error) => {
        game.networkInitializing = false;
        console.error("Network initialization failed:", error);
      });

    // Bind all extension methods to the game instance
    Object.keys(OnlineGameExtension.methods).forEach((methodName) => {
      game[methodName] = OnlineGameExtension.methods[methodName].bind(game);
    });

    // Set up online-specific UI event listeners
    OnlineGameExtension.setupOnlineUI(game);

    // Patch existing methods to add online behavior
    OnlineGameExtension.patchMethods(game);
  },

  /**
   * Set up online-specific UI event listeners
   */
  setupOnlineUI(game) {
    // Game mode selection
    document.querySelectorAll('input[name="game-mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        game.onGameModeChanged(e.target.value);
      });
    });

    // Lobby controls
    document.getElementById("copy-code-btn")?.addEventListener("click", () => {
      game.copyRoomCode();
    });
    document
      .getElementById("leave-lobby-btn")
      ?.addEventListener("click", () => {
        game.leaveLobby();
      });
    document
      .getElementById("start-online-btn")
      ?.addEventListener("click", () => {
        game.startOnlineGame();
      });
  },

  /**
   * Patch existing Game methods to add online behavior
   */
  patchMethods(game) {
    // Store original methods
    const originalStartGameFromSetup = game.startGameFromSetup.bind(game);
    const originalSelectTile = game.selectTile.bind(game);
    const originalAttemptPlacement = game.attemptPlacement.bind(game);
    const originalPassTurn = game.passTurn.bind(game);
    const originalNextTurn = game.nextTurn.bind(game);
    const originalRenderHand = game.renderHand.bind(game);
    const originalShowSetupModal = game.showSetupModal.bind(game);

    // Override startGameFromSetup to handle different modes
    game.startGameFromSetup = function () {
      const errorEl = document.getElementById("online-error");
      errorEl.style.display = "none";

      if (this.gameMode === "local") {
        originalStartGameFromSetup();
      } else if (this.gameMode === "host") {
        this.hostOnlineGame();
      } else if (this.gameMode === "join") {
        this.joinOnlineGame();
      }
    };

    // Override selectTile to check online turn
    game.selectTile = function (index) {
      // Don't allow selection if it's not our turn (online mode)
      if (this.network.isOnline && !this.isMyTurn()) return;
      originalSelectTile(index);
    };

    // Override attemptPlacement to broadcast state
    game.attemptPlacement = function (row, col) {
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
        // Calculate score
        const matchingSides = this.board.countMatchingSides(row, col);
        const points = matchingSides * 10;
        this.scores[this.currentPlayer] += points;

        // Place tile
        this.board.placeTile(row, col, triangle);

        // Remove from hand
        hand.splice(this.selectedTile, 1);
        this.selectedTile = null;

        // Check for game over
        if (this.checkGameOver()) {
          this.endGame();
          this.broadcastState();
        } else {
          this.showMessage(I18n.t("pointsScored", { n: points }));
          this.nextTurn();
          this.broadcastState();
        }
      } else {
        this.showMessage(result.reason, true);
      }
    };

    // Override passTurn to broadcast state
    game.passTurn = function () {
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

      // Check if game should end
      if (this.checkGameOver()) {
        this.endGame();
        this.broadcastState();
      } else {
        this.nextTurn();
        this.broadcastState();
      }
    };

    // Override nextTurn to handle online mode
    game.nextTurn = function () {
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
    };

    // Override renderHand to handle online mode
    game.renderHand = function () {
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
          svg.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.selectTile(index);
            this.rotateSelectedTile();
          });
        }
        container.appendChild(svg);
      });
    };

    // Override showSetupModal to reset online state
    game.showSetupModal = function () {
      originalShowSetupModal();

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
    };
  },

  /**
   * Methods to add to the Game instance
   */
  methods: {
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
    },

    /**
     * Host an online game
     */
    async hostOnlineGame() {
      const errorEl = document.getElementById("online-error");

      if (this.networkInitializing) {
        errorEl.textContent = I18n.t("connectingToServer");
        errorEl.style.display = "block";
        return;
      }

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
    },

    /**
     * Join an online game
     */
    async joinOnlineGame() {
      const errorEl = document.getElementById("online-error");

      if (this.networkInitializing) {
        errorEl.textContent = I18n.t("connectingToServer");
        errorEl.style.display = "block";
        return;
      }

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
    },

    /**
     * Show the lobby modal
     */
    showLobby(roomCode) {
      document.getElementById("lobby-room-code").textContent = roomCode;
      this.updateLobbyPlayers();
      document.getElementById("lobby-modal").classList.add("show");
    },

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
    },

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
    },

    /**
     * Leave the lobby
     */
    async leaveLobby() {
      await this.network.leaveGame();
      document.getElementById("lobby-modal").classList.remove("show");
      this.showSetupModal();
    },

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
    },

    /**
     * Called when an online game starts (for non-host players)
     */
    onOnlineGameStarted() {
      document.getElementById("lobby-modal").classList.remove("show");
      // State will be applied via applyRemoteState
    },

    /**
     * Called when a player joins the lobby
     */
    onPlayerJoined(playerData) {
      this.updateLobbyPlayers();
      if (document.getElementById("lobby-modal").classList.contains("show")) {
        this.showMessage(I18n.t("playerJoined", { name: playerData.name }));
      }
    },

    /**
     * Called when a player's status updates
     */
    onPlayerUpdated(playerData) {
      this.updateLobbyPlayers();
    },

    /**
     * Called when a player leaves
     */
    onPlayerLeft(playerData) {
      this.updateLobbyPlayers();
      if (playerData) {
        this.showMessage(I18n.t("playerLeft", { name: playerData.name }), true);
      }
    },

    /**
     * Check if it's this player's turn in online mode
     */
    isMyTurn() {
      if (!this.network.isOnline) return true;
      return this.currentPlayer === this.network.getMySlot();
    },

    /**
     * Broadcast current state to other players
     */
    async broadcastState() {
      if (this.network.isOnline) {
        const state = this.serializeState();
        await this.network.sendAction("state", state);
      }
    },

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
        hands: this.players.map((hand) =>
          hand.map((t) => this.serializeTile(t))
        ),
        gameStarted: this.gameStarted,
      };
    },

    /**
     * Serialize a single triangle tile
     */
    serializeTile(triangle) {
      return {
        sides: triangle.sides.map((s) => ({ value: s.value, color: s.color })),
        rotation: triangle.rotation,
      };
    },

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
    },

    /**
     * Deserialize a triangle tile
     */
    deserializeTile(data) {
      const t = new Triangle(
        data.sides.map((s) => ({ value: s.value, color: s.color }))
      );
      t.rotation = data.rotation;
      return t;
    },

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
    },
  },
};
