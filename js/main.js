// Initialize game when DOM is ready
let game;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize internationalization
  I18n.init();

  // Create game instance
  game = new Game();

  // Apply online multiplayer extension (adds network capabilities)
  // This keeps the base Game class clean and focused on local game logic
  OnlineGameExtension.apply(game);

  // Apply initial translations
  game.updateAllText();
});
