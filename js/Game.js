/**
 * Main game controller handling players, turns, and game state.
 */
class Game {
  constructor() {
    this.canvas = document.getElementById("game-board");
    this.board = new GameBoard(this.canvas, this);

    this.playerCount = 2;
    this.handSize = 6; // Fixed hand size
    this.players = [];
    this.playerNames = [];
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

    // Setup modal
    document.getElementById("setup-player-count").addEventListener("change", (e) => {
      this.playerCount = parseInt(e.target.value);
      this.updateSetupNameInputs();
    });

    document.getElementById("start-game-btn").addEventListener("click", () => {
      this.startGameFromSetup();
    });

    // Splash screen
    const splashScreen = document.getElementById("splash-screen");
    splashScreen.addEventListener("click", () => this.dismissSplash());

    // Turn announcement click to dismiss
    document.getElementById("turn-announcement").addEventListener("click", () => {
      this.dismissTurnAnnouncement();
    });
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
    document.getElementById("setup-player-count").value = this.playerCount.toString();
    this.updateSetupNameInputs();
    document.getElementById("setup-modal").classList.add("show");
  }

  updateSetupNameInputs() {
    const container = document.getElementById("setup-names-container");
    container.innerHTML = "";

    for (let i = 0; i < this.playerCount; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Player ${i + 1}`;
      input.value = this.playerNames[i] || "";
      input.dataset.playerIndex = i;
      container.appendChild(input);
    }
  }

  startGameFromSetup() {
    // Read player count
    this.playerCount = parseInt(document.getElementById("setup-player-count").value);

    // Read names from setup inputs
    const inputs = document.querySelectorAll("#setup-names-container input");
    this.playerNames = [];
    inputs.forEach((input, i) => {
      this.playerNames[i] = input.value.trim() || `Player ${i + 1}`;
    });

    // Hide setup modal
    document.getElementById("setup-modal").classList.remove("show");

    // Start the game
    this.newGame();
  }

  getPlayerName(index) {
    return this.playerNames[index] || `Player ${index + 1}`;
  }

  newGame() {
    this.board.clear();
    this.currentPlayer = 0;
    this.selectedTile = null;
    this.scores = Array(this.playerCount).fill(0);
    this.gameStarted = true;

    // Initialize player names if not set
    for (let i = 0; i < this.playerCount; i++) {
      if (!this.playerNames[i]) {
        this.playerNames[i] = `Player ${i + 1}`;
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
    this.showTurnAnnouncement(this.getPlayerName(0));
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
        this.showMessage(`+${points} points!`);
        this.nextTurn();
      }
    } else {
      this.showMessage(result.reason, true);
    }
  }

  passTurn() {
    const currentName = this.getPlayerName(this.currentPlayer);

    // Draw a new tile when passing
    if (this.tileBag.length > 0) {
      this.drawTiles(this.currentPlayer, 1);
      this.showMessage(`${currentName} passed and drew a tile`);
    } else {
      this.showMessage(`${currentName} passed (no tiles left to draw)`);
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
    document.getElementById("rotate-btn").disabled = true;
    document.getElementById("pass-btn").disabled = false;
    this.updateUI();
    this.board.render();

    // Show turn announcement
    this.showTurnAnnouncement(this.getPlayerName(this.currentPlayer));
  }

  showTurnAnnouncement(playerName) {
    const announcement = document.getElementById("turn-announcement");
    const text = document.getElementById("turn-text");
    text.textContent = `${playerName}'s Turn`;
    text.style.color = PLAYER_COLORS[this.currentPlayer];
    announcement.classList.add("show");

    // Auto-dismiss after 1.5 seconds
    this.turnAnnouncementTimeout = setTimeout(() => {
      this.dismissTurnAnnouncement();
    }, 1500);
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
    const maxScore = Math.max(...this.scores);
    const winners = this.scores
      .map((score, index) => ({ score, index }))
      .filter((p) => p.score === maxScore);

    let winnerText;
    if (winners.length > 1) {
      winnerText = "It's a tie!";
    } else {
      winnerText = `${this.getPlayerName(winners[0].index)} wins!`;
    }

    document.getElementById("winner-text").textContent = winnerText;

    const scoresHtml = this.scores
      .map((score, i) => {
        const isWinner = score === maxScore;
        return `<div class="score-row ${isWinner ? "winner-row" : ""}">
                <span>${this.getPlayerName(i)}</span>
                <span>${score} points</span>
            </div>`;
      })
      .join("");

    document.getElementById("final-scores").innerHTML = scoresHtml;
    document.getElementById("game-over-modal").classList.add("show");
  }

  updateUI() {
    // Update current player display
    const playerName = document.getElementById("current-player");
    playerName.textContent = this.getPlayerName(this.currentPlayer);
    playerName.style.color = PLAYER_COLORS[this.currentPlayer];

    // Update scores
    this.updateScoreBoard();

    // Update tiles remaining
    document.getElementById("tiles-remaining").textContent =
      this.tileBag.length;

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

    hand.forEach((triangle, index) => {
      const svg = this.createTriangleSVG(triangle, index === this.selectedTile);
      svg.addEventListener("click", () => this.selectTile(index));
      // Right-click to rotate on hand tiles
      svg.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.selectTile(index);
        this.rotateSelectedTile();
      });
      container.appendChild(svg);
    });
  }

  createTriangleSVG(triangle, selected = false) {
    const size = 70;
    const h = size;
    const w = (h * 2) / Math.sqrt(3);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", w + 10);
    svg.setAttribute("height", h + 10);
    svg.setAttribute("viewBox", `0 0 ${w + 10} ${h + 10}`);
    svg.classList.add("hand-tile");
    if (selected) svg.classList.add("selected");

    const cx = w / 2 + 5;
    const cy = h / 2 + 5;

    // Triangle vertices (pointing up)
    const vertices = [
      { x: cx, y: cy - h / 2 }, // Top
      { x: cx - w / 2, y: cy + h / 2 }, // Bottom left
      { x: cx + w / 2, y: cy + h / 2 }, // Bottom right
    ];

    // Background
    const bg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );
    bg.setAttribute("points", vertices.map((v) => `${v.x},${v.y}`).join(" "));
    bg.setAttribute("fill", "#1a1a25");
    bg.setAttribute("stroke", selected ? "#00f5d4" : "#2a2a3a");
    bg.setAttribute("stroke-width", selected ? "3" : "1");
    svg.appendChild(bg);

    // Sides
    const sides = [
      [vertices[1], vertices[2]], // Side 0 (bottom)
      [vertices[0], vertices[1]], // Side 1 (left)
      [vertices[2], vertices[0]], // Side 2 (right)
    ];

    for (let i = 0; i < 3; i++) {
      const side = triangle.getSide(i);
      const [v1, v2] = sides[i];

      // Colored line
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", v1.x);
      line.setAttribute("y1", v1.y);
      line.setAttribute("x2", v2.x);
      line.setAttribute("y2", v2.y);
      line.setAttribute("stroke", COLORS[side.color]);
      line.setAttribute("stroke-width", "4");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);

      // Value
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;

      const toCenter = { x: cx - midX, y: cy - midY };
      const len = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
      const offset = 14;
      const labelX = midX + (toCenter.x / len) * offset;
      const labelY = midY + (toCenter.y / len) * offset;

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", labelX);
      text.setAttribute("y", labelY);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", COLORS[side.color]);
      text.setAttribute("font-family", "Rajdhani, sans-serif");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("font-size", "14");
      text.textContent = side.value;
      svg.appendChild(text);
    }

    return svg;
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
