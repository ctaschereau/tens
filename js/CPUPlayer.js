/**
 * Handles CPU player AI logic - finding and executing optimal moves.
 */
class CPUPlayer {
  constructor(game) {
    this.game = game;
    this.thinking = false;
  }

  /**
   * Check if currently thinking/processing
   */
  isThinking() {
    return this.thinking;
  }

  /**
   * Set thinking state
   */
  setThinking(value) {
    this.thinking = value;
  }

  /**
   * Schedule a CPU turn with a delay for visibility
   */
  scheduleTurn(callback) {
    if (this.thinking) return;
    this.thinking = true;

    // Add a delay to make CPU moves visible
    setTimeout(() => {
      this.playTurn(callback);
    }, 800);
  }

  /**
   * Execute the CPU's turn - find and make the best move
   */
  playTurn(callback) {
    if (!this.game.gameStarted || this.game.checkGameOver()) return;

    const hand = this.game.getCurrentPlayerHand();
    const bestMove = this.findBestMove(hand);

    if (bestMove) {
      callback(bestMove);
    } else {
      // No valid move, pass turn
      this.thinking = true; // Allow pass
      this.game.passTurn();
    }
  }

  /**
   * Find the best move from the current hand
   * @param {Triangle[]} hand - Array of triangles in hand
   * @returns {Object|null} Best move object or null if no valid moves
   */
  findBestMove(hand) {
    let bestMove = null;
    let bestScore = -1;

    // Find the best move (highest score)
    for (let tileIndex = 0; tileIndex < hand.length; tileIndex++) {
      const triangle = hand[tileIndex];
      const originalRotation = triangle.rotation;

      // Try all rotations
      for (let rotation = 0; rotation < 3; rotation++) {
        triangle.rotation = rotation;

        // Get all valid placements for this tile/rotation
        const placements = this.findValidPlacements(triangle);

        for (const placement of placements) {
          const score = this.game.board.countMatchingSides(
            placement.row,
            placement.col
          );
          if (score > bestScore) {
            bestScore = score;
            bestMove = {
              tileIndex,
              row: placement.row,
              col: placement.col,
              rotation,
            };
          }
        }
      }

      // Restore original rotation
      triangle.rotation = originalRotation;
    }

    return bestMove;
  }

  /**
   * Find all valid placement positions for a given triangle
   * @param {Triangle} triangle - The triangle to place
   * @returns {Array} Array of valid {row, col} positions
   */
  findValidPlacements(triangle) {
    const validPositions = [];
    const board = this.game.board;

    if (board.tiles.size === 0) {
      return [{ row: 0, col: 0 }];
    }

    const checked = new Set();

    for (const [key] of board.tiles) {
      const [row, col] = key.split(",").map(Number);
      const adjacent = board.getAdjacentCells(row, col);

      for (const adj of adjacent) {
        const adjKey = board.getKey(adj.row, adj.col);
        if (checked.has(adjKey)) continue;
        checked.add(adjKey);

        if (board.canPlace(adj.row, adj.col, triangle).valid) {
          validPositions.push({ row: adj.row, col: adj.col });
        }
      }
    }

    return validPositions;
  }
}
