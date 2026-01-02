# TENS

A strategic triangle tile-matching game where colors must match and numbers must sum to ten.

![TENS Game](https://img.shields.io/badge/game-TENS-00f5d4?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-f7df1e?style=for-the-badge&logo=javascript)
![License](https://img.shields.io/badge/license-MIT-7b2cbf?style=for-the-badge)

## About

TENS is a multiplayer tile-placement game featuring triangular tiles. Each tile has three sides, and each side has a **color** and a **number** (0-10). The challenge? When placing tiles, adjacent sides must:

1. **Match colors** — both touching sides must be the same color
2. **Sum to 10** — the numbers on touching sides must add up to exactly 10

Score points for each successfully matched side and outplay your opponents!

## Features

- 🎮 **2-4 Players** — Local hotseat multiplayer
- 🤖 **CPU Opponents** — Play against AI players
- 🌍 **Multilingual** — English and French support
- 🎨 **6 Vibrant Colors** — Orange, Blue, Red, Green, Purple, Yellow
- ♻️ **Tile Rotation** — Rotate tiles to find the perfect fit
- 📱 **Responsive Design** — Works on desktop and tablet

## How to Play

1. **Start a Game** — Choose the number of players and set names (or enable CPU)
2. **Select a Tile** — Click a tile from your hand to select it
3. **Rotate if Needed** — Right-click or use the Rotate button to rotate the tile
4. **Place the Tile** — Click on a valid position on the board
5. **Score Points** — Earn 10 points for each matching side
6. **Pass Turn** — If you can't play, pass to draw a new tile

The game ends when a player runs out of tiles. Highest score wins!

## Controls

| Action | Control |
|--------|---------|
| Select tile | Left-click on hand tile |
| Rotate tile | Right-click or Rotate button |
| Place tile | Left-click on board |
| Pass turn | Pass button or **Spacebar** |
| Pan board | Drag on empty board area |

## Running the Game

Simply open `index.html` in a modern web browser. No build process or server required!

```bash
# Clone the repository
git clone https://github.com/yourusername/tens.git

# Open in browser
open index.html
# or
xdg-open index.html  # Linux
start index.html     # Windows
```

## Project Structure

```
tens/
├── index.html          # Main HTML file
├── style.css           # Styles and animations
└── js/
    ├── main.js         # Entry point
    ├── Game.js         # Game controller and logic
    ├── GameBoard.js    # Board rendering and tile placement
    ├── Triangle.js     # Triangle tile data structure
    ├── TileRenderer.js # SVG/Canvas tile rendering
    ├── CPUPlayer.js    # AI opponent logic
    ├── constants.js    # Color and player definitions
    └── i18n/           # Internationalization
        ├── i18n.js     # Translation system
        ├── en.js       # English strings
        └── fr.js       # French strings
```

## Tech Stack

- **Vanilla JavaScript** — No frameworks, just clean ES6+
- **HTML5 Canvas** — For the game board rendering
- **SVG** — For hand tile rendering
- **CSS3** — Modern styling with custom properties and animations

## Screenshots

The game features a sleek, dark cyberpunk-inspired UI with:
- Glowing accents in cyan and purple
- Smooth animations and transitions
- Clear visual feedback for valid/invalid placements

---

## Credits

This game was created by **Claude** (Anthropic's AI assistant) in collaboration with the project owner.

## License

MIT License — feel free to use, modify, and distribute!

