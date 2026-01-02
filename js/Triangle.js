/**
 * Represents a triangular tile with 3 sides.
 * Each side has a color and a value (0-10).
 *
 * Triangle side indices: 0 = bottom/top (base), 1 = left, 2 = right
 * For pointing-up triangles: 0=bottom, 1=left-upper, 2=right-upper
 * For pointing-down triangles: 0=top, 1=left-lower, 2=right-lower
 */
class Triangle {
  constructor(sides = null) {
    if (sides) {
      this.sides = sides;
    } else {
      // Generate random sides
      this.sides = [];
      for (let i = 0; i < 3; i++) {
        this.sides.push({
          value: Math.floor(Math.random() * 11), // 0-10
          color: COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)],
        });
      }
    }
    this.rotation = 0; // 0, 1, or 2 (each represents 120 degrees)
  }

  /**
   * Rotate the triangle 120 degrees clockwise
   */
  rotate() {
    this.rotation = (this.rotation + 1) % 3;
  }

  /**
   * Get the actual side at position after rotation
   * @param {number} position - The side index (0, 1, or 2)
   * @returns {Object} The side object with color and value
   */
  getSide(position) {
    const actualIndex = (position + this.rotation) % 3;
    return this.sides[actualIndex];
  }

  /**
   * Create a deep copy of this triangle
   * @returns {Triangle} A new Triangle with the same properties
   */
  clone() {
    const t = new Triangle([...this.sides.map((s) => ({ ...s }))]);
    t.rotation = this.rotation;
    return t;
  }
}
