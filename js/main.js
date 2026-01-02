// Initialize game when DOM is ready
let game;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize internationalization
  I18n.init();

  // Create game instance
  game = new Game();

  // Apply initial translations
  game.updateAllText();
});
