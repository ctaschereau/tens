/**
 * Manages the game board canvas, tile placement, and rendering.
 */
class GameBoard {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.tiles = new Map(); // key: "row,col" -> { triangle, pointsUp }
    this.triangleSize = 85; // Height of triangle (matches hand tiles)
    this.offsetX = 0;
    this.offsetY = 0;
    this.hoveredCell = null;

    // Panning state
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.panOffsetStartX = 0;
    this.panOffsetStartY = 0;

    this.resize();
    this.setupEvents();
  }

  resize() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;
    this.render();
  }

  setupEvents() {
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Handle panning
      if (this.isPanning) {
        const dx = x - this.panStartX;
        const dy = y - this.panStartY;
        this.offsetX = this.panOffsetStartX + dx;
        this.offsetY = this.panOffsetStartY + dy;
        this.render();
        return;
      }

      this.hoveredCell = this.pixelToGrid(x, y);
      this.updateCursor();
      this.render();
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredCell = null;
      this.isPanning = false;
      this.canvas.classList.remove("panning");
      this.canvas.classList.remove("can-pan");
      this.render();
    });

    this.canvas.addEventListener("mousedown", (e) => {
      // Start panning with middle mouse button OR left click when no tile selected
      const isMiddleButton = e.button === 1;
      const isLeftButton = e.button === 0;
      const noTileSelected = this.game.selectedTile === null;

      if (isMiddleButton || (isLeftButton && noTileSelected)) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        this.isPanning = true;
        this.panStartX = e.clientX - rect.left;
        this.panStartY = e.clientY - rect.top;
        this.panOffsetStartX = this.offsetX;
        this.panOffsetStartY = this.offsetY;
        this.canvas.classList.add("panning");
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.classList.remove("panning");
        this.updateCursor();
      }
    });

    this.canvas.addEventListener("click", (e) => {
      // Don't process click if we just finished panning
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if this was a pan operation (mouse moved significantly)
      if (this.panStartX !== 0 || this.panStartY !== 0) {
        const dx = Math.abs(x - this.panStartX);
        const dy = Math.abs(y - this.panStartY);
        if (dx > 5 || dy > 5) {
          // This was a pan, not a click
          this.panStartX = 0;
          this.panStartY = 0;
          return;
        }
      }

      const cell = this.pixelToGrid(x, y);
      if (cell && this.game.selectedTile !== null) {
        this.game.attemptPlacement(cell.row, cell.col);
      }
    });

    // Right-click to rotate
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (this.game.selectedTile !== null) {
        this.game.rotateSelectedTile();
      }
    });

    // Prevent middle-click auto-scroll
    this.canvas.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    });
  }

  updateCursor() {
    // Show grab cursor when no tile is selected (ready to pan)
    if (this.game.selectedTile === null) {
      this.canvas.classList.add("can-pan");
    } else {
      this.canvas.classList.remove("can-pan");
    }
  }

  /**
   * Convert pixel coordinates to grid cell
   */
  pixelToGrid(px, py) {
    const h = this.triangleSize;
    const w = (h * 2) / Math.sqrt(3);

    // Adjust for offset
    const x = px - this.offsetX;
    const y = py - this.offsetY;

    // Calculate column
    const colWidth = w / 2;
    const col = Math.round(x / colWidth);

    // Base row calculation
    const rowHeight = h;
    const baseRow = Math.floor(y / rowHeight + 0.5);

    // Determine if pointing up or down based on position
    const pointsUp = (baseRow + col) % 2 === 0;

    return { row: baseRow, col, pointsUp };
  }

  /**
   * Convert grid cell to pixel coordinates (center of triangle)
   */
  gridToPixel(row, col) {
    const h = this.triangleSize;
    const w = (h * 2) / Math.sqrt(3);

    const x = col * (w / 2) + this.offsetX;
    const y = row * h + this.offsetY;

    return { x, y };
  }

  getKey(row, col) {
    return `${row},${col}`;
  }

  placeTile(row, col, triangle) {
    const pointsUp = (row + col) % 2 === 0;
    this.tiles.set(this.getKey(row, col), {
      triangle: triangle.clone(),
      pointsUp,
    });
  }

  getTile(row, col) {
    return this.tiles.get(this.getKey(row, col));
  }

  hasTile(row, col) {
    return this.tiles.has(this.getKey(row, col));
  }

  /**
   * Get adjacent cells and which sides touch
   */
  getAdjacentCells(row, col) {
    const pointsUp = (row + col) % 2 === 0;
    const adjacent = [];

    if (pointsUp) {
      // Pointing up triangle
      // Side 0 (bottom) touches row+1, col (pointing down, its side 0)
      adjacent.push({ row: row + 1, col: col, mySide: 0, theirSide: 0 });
      // Side 1 (left) touches row, col-1 (pointing down, its side 2)
      adjacent.push({ row: row, col: col - 1, mySide: 1, theirSide: 2 });
      // Side 2 (right) touches row, col+1 (pointing down, its side 1)
      adjacent.push({ row: row, col: col + 1, mySide: 2, theirSide: 1 });
    } else {
      // Pointing down triangle
      // Side 0 (top) touches row-1, col (pointing up, its side 0)
      adjacent.push({ row: row - 1, col: col, mySide: 0, theirSide: 0 });
      // Side 1 (left) touches row, col-1 (pointing up, its side 2)
      adjacent.push({ row: row, col: col - 1, mySide: 1, theirSide: 2 });
      // Side 2 (right) touches row, col+1 (pointing up, its side 1)
      adjacent.push({ row: row, col: col + 1, mySide: 2, theirSide: 1 });
    }

    return adjacent;
  }

  /**
   * Check if placement is valid
   */
  canPlace(row, col, triangle) {
    // Can't place on existing tile
    if (this.hasTile(row, col)) {
      return { valid: false, reason: I18n.t("cellOccupied") };
    }

    // If board is empty, can place anywhere
    if (this.tiles.size === 0) {
      return { valid: true };
    }

    const adjacent = this.getAdjacentCells(row, col);
    let hasAdjacentTile = false;

    for (const adj of adjacent) {
      const neighborTile = this.getTile(adj.row, adj.col);
      if (neighborTile) {
        hasAdjacentTile = true;

        const mySide = triangle.getSide(adj.mySide);
        const theirSide = neighborTile.triangle.getSide(adj.theirSide);

        // Check color match
        if (mySide.color !== theirSide.color) {
          return {
            valid: false,
            reason: I18n.t("colorsDontMatch", {
              color1: mySide.color,
              color2: theirSide.color,
            }),
          };
        }

        // Check sum equals 10
        if (mySide.value + theirSide.value !== 10) {
          return {
            valid: false,
            reason: I18n.t("sumNotTen", {
              sum: mySide.value + theirSide.value,
            }),
          };
        }
      }
    }

    if (!hasAdjacentTile) {
      return { valid: false, reason: I18n.t("mustBeAdjacent") };
    }

    return { valid: true };
  }

  /**
   * Get all valid placement positions for a given triangle
   */
  getValidPlacements(triangle) {
    const validPositions = [];

    if (this.tiles.size === 0) {
      // First tile - can go in center
      return [{ row: 0, col: 0 }];
    }

    // Check all cells adjacent to existing tiles
    const checked = new Set();

    for (const [key] of this.tiles) {
      const [row, col] = key.split(",").map(Number);
      const adjacent = this.getAdjacentCells(row, col);

      for (const adj of adjacent) {
        const adjKey = this.getKey(adj.row, adj.col);
        if (checked.has(adjKey)) continue;
        checked.add(adjKey);

        // Try all rotations
        const originalRotation = triangle.rotation;
        for (let r = 0; r < 3; r++) {
          triangle.rotation = r;
          if (this.canPlace(adj.row, adj.col, triangle).valid) {
            validPositions.push({ row: adj.row, col: adj.col, rotation: r });
          }
        }
        triangle.rotation = originalRotation;
      }
    }

    return validPositions;
  }

  /**
   * Count matching sides for scoring
   */
  countMatchingSides(row, col) {
    const adjacent = this.getAdjacentCells(row, col);
    let count = 0;

    for (const adj of adjacent) {
      if (this.getTile(adj.row, adj.col)) {
        count++;
      }
    }

    return count;
  }

  clear() {
    this.tiles.clear();
    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update cursor based on selection state
    this.updateCursor();

    // Draw placed tiles
    for (const [key, tile] of this.tiles) {
      const [row, col] = key.split(",").map(Number);
      const { x, y } = this.gridToPixel(row, col);
      TileRenderer.drawCanvasTriangle(
        ctx,
        x,
        y,
        this.triangleSize,
        tile.triangle,
        tile.pointsUp
      );
    }

    // Draw hover preview
    if (this.hoveredCell && this.game.selectedTile !== null) {
      const { row, col, pointsUp } = this.hoveredCell;
      const triangle = this.game.getCurrentPlayerHand()[this.game.selectedTile];

      if (triangle) {
        const canPlace = this.canPlace(row, col, triangle);
        const { x, y } = this.gridToPixel(row, col);
        TileRenderer.drawCanvasTrianglePreview(
          ctx,
          x,
          y,
          this.triangleSize,
          triangle,
          pointsUp,
          canPlace.valid
        );
      }
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    const h = this.triangleSize;
    const w = (h * 2) / Math.sqrt(3);

    ctx.strokeStyle = "rgba(42, 42, 58, 0.5)";
    ctx.lineWidth = 1;

    // Draw a grid of triangles
    const cols = Math.ceil(this.canvas.width / (w / 2)) + 4;
    const rows = Math.ceil(this.canvas.height / h) + 4;

    for (let row = -rows / 2; row < rows / 2; row++) {
      for (let col = -cols / 2; col < cols / 2; col++) {
        const pointsUp = (row + col) % 2 === 0;
        const { x, y } = this.gridToPixel(row, col);
        TileRenderer.drawCanvasTriangleOutline(
          ctx,
          x,
          y,
          this.triangleSize,
          pointsUp
        );
      }
    }
  }
}
