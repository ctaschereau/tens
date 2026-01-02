/**
 * Manages the game board canvas, tile placement, and rendering.
 */
class GameBoard {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.tiles = new Map(); // key: "row,col" -> { triangle, pointsUp }
    this.triangleSize = 60; // Height of triangle
    this.offsetX = 0;
    this.offsetY = 0;
    this.hoveredCell = null;

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
      this.hoveredCell = this.pixelToGrid(x, y);
      this.render();
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredCell = null;
      this.render();
    });

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
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
      return { valid: false, reason: "Cell occupied" };
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
            reason: `Colors don't match (${mySide.color} vs ${theirSide.color})`,
          };
        }

        // Check sum equals 10
        if (mySide.value + theirSide.value !== 10) {
          return {
            valid: false,
            reason: `Sum is ${mySide.value + theirSide.value}, not 10`,
          };
        }
      }
    }

    if (!hasAdjacentTile) {
      return { valid: false, reason: "Must be adjacent to existing tile" };
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

    // Draw placed tiles
    for (const [key, tile] of this.tiles) {
      const [row, col] = key.split(",").map(Number);
      this.drawTriangle(row, col, tile.triangle, tile.pointsUp);
    }

    // Draw hover preview
    if (this.hoveredCell && this.game.selectedTile !== null) {
      const { row, col, pointsUp } = this.hoveredCell;
      const triangle = this.game.getCurrentPlayerHand()[this.game.selectedTile];

      if (triangle) {
        const canPlace = this.canPlace(row, col, triangle);
        this.drawTrianglePreview(row, col, triangle, pointsUp, canPlace.valid);
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
        this.drawTriangleOutline(row, col, pointsUp);
      }
    }
  }

  drawTriangleOutline(row, col, pointsUp) {
    const ctx = this.ctx;
    const { x, y } = this.gridToPixel(row, col);
    const h = this.triangleSize;
    const w = (h * 2) / Math.sqrt(3);

    ctx.beginPath();
    if (pointsUp) {
      ctx.moveTo(x, y - h / 2); // Top
      ctx.lineTo(x - w / 2, y + h / 2); // Bottom left
      ctx.lineTo(x + w / 2, y + h / 2); // Bottom right
    } else {
      ctx.moveTo(x, y + h / 2); // Bottom
      ctx.lineTo(x - w / 2, y - h / 2); // Top left
      ctx.lineTo(x + w / 2, y - h / 2); // Top right
    }
    ctx.closePath();
    ctx.stroke();
  }

  drawTriangle(row, col, triangle, pointsUp, alpha = 1) {
    const ctx = this.ctx;
    const { x, y } = this.gridToPixel(row, col);
    const h = this.triangleSize;
    const w = (h * 2) / Math.sqrt(3);

    // Calculate vertices
    let vertices;
    if (pointsUp) {
      vertices = [
        { x: x, y: y - h / 2 }, // Top (between sides 1 and 2)
        { x: x - w / 2, y: y + h / 2 }, // Bottom left (between sides 0 and 1)
        { x: x + w / 2, y: y + h / 2 }, // Bottom right (between sides 0 and 2)
      ];
    } else {
      vertices = [
        { x: x, y: y + h / 2 }, // Bottom (between sides 1 and 2)
        { x: x - w / 2, y: y - h / 2 }, // Top left (between sides 0 and 1)
        { x: x + w / 2, y: y - h / 2 }, // Top right (between sides 0 and 2)
      ];
    }

    // Draw filled triangle with gradient
    ctx.globalAlpha = alpha;

    const gradient = ctx.createLinearGradient(
      x - w / 2,
      y - h / 2,
      x + w / 2,
      y + h / 2
    );
    gradient.addColorStop(0, "#1a1a25");
    gradient.addColorStop(1, "#252535");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    ctx.lineTo(vertices[1].x, vertices[1].y);
    ctx.lineTo(vertices[2].x, vertices[2].y);
    ctx.closePath();
    ctx.fill();

    // Draw colored sides with values
    const sides = [
      [vertices[1], vertices[2]], // Side 0 (base)
      [vertices[0], vertices[1]], // Side 1 (left)
      [vertices[2], vertices[0]], // Side 2 (right)
    ];

    for (let i = 0; i < 3; i++) {
      const side = triangle.getSide(i);
      const [v1, v2] = sides[i];

      // Draw colored side
      ctx.strokeStyle = COLORS[side.color];
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.stroke();

      // Draw value near the side
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;

      // Offset toward center
      const toCenter = { x: x - midX, y: y - midY };
      const len = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
      const offset = 12;
      const labelX = midX + (toCenter.x / len) * offset;
      const labelY = midY + (toCenter.y / len) * offset;

      ctx.font = "bold 14px Rajdhani";
      ctx.fillStyle = COLORS[side.color];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(side.value.toString(), labelX, labelY);
    }

    ctx.globalAlpha = 1;
  }

  drawTrianglePreview(row, col, triangle, pointsUp, isValid) {
    const ctx = this.ctx;
    const { x, y } = this.gridToPixel(row, col);
    const h = this.triangleSize;
    const w = (h * 2) / Math.sqrt(3);

    // Draw semi-transparent preview
    ctx.globalAlpha = 0.6;
    this.drawTriangle(row, col, triangle, pointsUp, 0.6);

    // Draw validity indicator
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = isValid ? "#00f5d4" : "#ff6b6b";
    ctx.lineWidth = 3;

    ctx.beginPath();
    if (pointsUp) {
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x - w / 2, y + h / 2);
      ctx.lineTo(x + w / 2, y + h / 2);
    } else {
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x - w / 2, y - h / 2);
      ctx.lineTo(x + w / 2, y - h / 2);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 1;
  }
}
