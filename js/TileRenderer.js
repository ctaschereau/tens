/**
 * Handles rendering of triangle tiles - both SVG for hand and Canvas for board.
 */
const TileRenderer = {
  // Default sizes
  handTileSize: 85,
  labelOffset: 18,

  /**
   * Create an SVG element for a hand tile
   * @param {Triangle} triangle - The triangle to render
   * @param {boolean} selected - Whether the tile is selected
   * @param {boolean} hidden - Whether to hide the tile values (for CPU)
   * @returns {SVGElement} The SVG element
   */
  createHandTileSVG(triangle, selected = false, hidden = false) {
    const size = this.handTileSize;
    const h = size;
    const w = (h * 2) / Math.sqrt(3);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", w + 10);
    svg.setAttribute("height", h + 10);
    svg.setAttribute("viewBox", `0 0 ${w + 10} ${h + 10}`);
    svg.classList.add("hand-tile");
    if (selected) svg.classList.add("selected");
    if (hidden) svg.style.opacity = "0.5";

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
    bg.setAttribute("fill", hidden ? "#2a2a3a" : "#1a1a25");
    bg.setAttribute("stroke", selected ? "#00f5d4" : "#2a2a3a");
    bg.setAttribute("stroke-width", selected ? "3" : "1");
    svg.appendChild(bg);

    // If hidden (CPU), don't show the values/colors
    if (hidden) {
      const questionMark = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      questionMark.setAttribute("x", cx);
      questionMark.setAttribute("y", cy + 5);
      questionMark.setAttribute("text-anchor", "middle");
      questionMark.setAttribute("dominant-baseline", "middle");
      questionMark.setAttribute("fill", "#555566");
      questionMark.setAttribute("font-family", "Orbitron, sans-serif");
      questionMark.setAttribute("font-weight", "bold");
      questionMark.setAttribute("font-size", "20");
      questionMark.textContent = "?";
      svg.appendChild(questionMark);
      return svg;
    }

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

      // Value label
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;

      const toCenter = { x: cx - midX, y: cy - midY };
      const len = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
      const labelX = midX + (toCenter.x / len) * this.labelOffset;
      const labelY = midY + (toCenter.y / len) * this.labelOffset;

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
  },

  /**
   * Draw a triangle on a canvas context
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} size - Triangle height
   * @param {Triangle} triangle - The triangle data
   * @param {boolean} pointsUp - Whether triangle points up
   * @param {number} alpha - Opacity (0-1)
   */
  drawCanvasTriangle(ctx, x, y, size, triangle, pointsUp, alpha = 1) {
    const h = size;
    const w = (h * 2) / Math.sqrt(3);

    // Calculate vertices
    let vertices;
    if (pointsUp) {
      vertices = [
        { x: x, y: y - h / 2 }, // Top
        { x: x - w / 2, y: y + h / 2 }, // Bottom left
        { x: x + w / 2, y: y + h / 2 }, // Bottom right
      ];
    } else {
      vertices = [
        { x: x, y: y + h / 2 }, // Bottom
        { x: x - w / 2, y: y - h / 2 }, // Top left
        { x: x + w / 2, y: y - h / 2 }, // Top right
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
      const labelX = midX + (toCenter.x / len) * this.labelOffset;
      const labelY = midY + (toCenter.y / len) * this.labelOffset;

      ctx.font = "bold 14px Rajdhani";
      ctx.fillStyle = COLORS[side.color];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(side.value.toString(), labelX, labelY);
    }

    ctx.globalAlpha = 1;
  },

  /**
   * Draw a triangle preview (for hover) on canvas
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} size - Triangle height
   * @param {Triangle} triangle - The triangle data
   * @param {boolean} pointsUp - Whether triangle points up
   * @param {boolean} isValid - Whether placement is valid
   */
  drawCanvasTrianglePreview(ctx, x, y, size, triangle, pointsUp, isValid) {
    const h = size;
    const w = (h * 2) / Math.sqrt(3);

    // Draw semi-transparent preview
    ctx.globalAlpha = 0.6;
    this.drawCanvasTriangle(ctx, x, y, size, triangle, pointsUp, 0.6);

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
  },

  /**
   * Draw a triangle outline on canvas (for grid)
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} size - Triangle height
   * @param {boolean} pointsUp - Whether triangle points up
   */
  drawCanvasTriangleOutline(ctx, x, y, size, pointsUp) {
    const h = size;
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
  },
};
