/**
 * Main game controller handling players, turns, and game state.
 */
class Game {
  constructor() {
    this.canvas = document.getElementById("game-board");
    this.board = new GameBoard(this.canvas, this);
    this.cpuPlayer = new CPUPlayer(this);

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

    // Splash screen
    const splashScreen = document.getElementById("splash-screen");
    splashScreen.addEventListener("click", () => this.dismissSplash());

    // Turn announcement click to dismiss
    document
      .getElementById("turn-announcement")
      .addEventListener("click", () => {
        this.dismissTurnAnnouncement();
      });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // ESC key to dismiss setup modal (only if game in progress)
      if (e.key === "Escape") {
        const setupModal = document.getElementById("setup-modal");
        if (setupModal.classList.contains("show") && this.gameStarted) {
          setupModal.classList.remove("show");
        }
      }

      // Spacebar to pass turn
      if (e.key === " " || e.code === "Space") {
        // Don't trigger if typing in an input field
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          return;
        }
        // Don't trigger if a modal is open
        const anyModalOpen = document.querySelector(".modal.show");
        if (anyModalOpen) {
          return;
        }
        // Only if game is started
        if (this.gameStarted) {
          e.preventDefault();
          this.passTurn();
        }
      }
    });
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
    // Don't allow selection if CPU is playing
    if (this.isCurrentPlayerCPU()) return;

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
      } else {
        this.showMessage(I18n.t("pointsScored", { n: points }));
        this.nextTurn();
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
    } else {
      this.nextTurn();
    }
  }

  nextTurn() {
    this.currentPlayer = (this.currentPlayer + 1) % this.playerCount;
    this.selectedTile = null;
    this.cpuPlayer.setThinking(false);
    document.getElementById("rotate-btn").disabled = true;
    document.getElementById("pass-btn").disabled = this.isCurrentPlayerCPU();
    this.updateUI();
    this.board.render();

    // Show turn announcement
    this.showTurnAnnouncement(this.getPlayerName(this.currentPlayer), () => {
      // After announcement, check if current player is CPU
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
    const hand = this.getCurrentPlayerHand();

    container.innerHTML = "";

    if (!hand) return;

    // If CPU player, show cards face down or hide them
    const isCPU = this.isCurrentPlayerCPU();

    hand.forEach((triangle, index) => {
      const svg = TileRenderer.createHandTileSVG(
        triangle,
        index === this.selectedTile,
        isCPU
      );
      if (!isCPU) {
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
}
