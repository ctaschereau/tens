/**
 * Handles online multiplayer via Firebase Realtime Database.
 * Uses Firebase Anonymous Authentication for secure player identification.
 * This is optional - the game works fully offline in local mode.
 */
class NetworkManager {
  constructor(game) {
    this.game = game;
    this.db = null;
    this.auth = null;
    this.roomRef = null;
    this.roomCode = null;
    this.playerId = null; // Will be set to auth.uid after authentication
    this.playerSlot = null;
    this.isOnline = false;
    this.isHost = false;
    this.playerName = "";
    this.connectedPlayers = new Map();
    this.initialized = false;
    this.authenticated = false;
    this.lastStateTimestamp = 0;
  }

  /**
   * Initialize Firebase and authenticate (call once on app start)
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async init() {
    // Check if Firebase is available
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK not loaded - online mode disabled");
      return false;
    }

    // Firebase config for tens project
    const firebaseConfig = {
      apiKey: "AIzaSyAgaF_z8y07yO5zx2KiwAQxSHxMrMl6N_0",
      authDomain: "tens-49e4a.firebaseapp.com",
      databaseURL: "https://tens-49e4a-default-rtdb.firebaseio.com",
      projectId: "tens-49e4a",
      storageBucket: "tens-49e4a.firebasestorage.app",
      messagingSenderId: "433112178354",
      appId: "1:433112178354:web:4dfcf9dfe578965ed073ab",
    };

    try {
      // Initialize Firebase only if not already initialized
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.db = firebase.database();
      this.auth = firebase.auth();

      // Sign in anonymously - this gives us a verified auth.uid
      // that can be used in security rules
      await this.signInAnonymously();

      this.initialized = true;
      console.log("Firebase initialized, authenticated as:", this.playerId);
      return true;
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      return false;
    }
  }

  /**
   * Sign in anonymously to get a verified user ID
   * @returns {Promise<void>}
   */
  async signInAnonymously() {
    try {
      // Check if already signed in
      const currentUser = this.auth.currentUser;
      if (currentUser) {
        this.playerId = currentUser.uid;
        this.authenticated = true;
        console.log("Already authenticated:", this.playerId);
        return;
      }

      // Sign in anonymously
      const userCredential = await this.auth.signInAnonymously();
      this.playerId = userCredential.user.uid;
      this.authenticated = true;
      console.log("Signed in anonymously:", this.playerId);

      // Listen for auth state changes (e.g., token refresh)
      this.auth.onAuthStateChanged((user) => {
        if (user) {
          this.playerId = user.uid;
          this.authenticated = true;
        } else {
          // User signed out, try to sign in again
          this.authenticated = false;
          this.signInAnonymously();
        }
      });
    } catch (error) {
      console.error("Anonymous authentication failed:", error);
      // Fall back to localStorage ID (less secure, won't work with strict rules)
      this.playerId = localStorage.getItem("tens_playerId");
      if (!this.playerId) {
        this.playerId = this.generateId();
        localStorage.setItem("tens_playerId", this.playerId);
      }
      console.warn(
        "Using fallback player ID (not authenticated):",
        this.playerId
      );
    }
  }

  /**
   * Check if Firebase is ready and authenticated
   */
  isAvailable() {
    return this.initialized && this.db !== null && this.authenticated;
  }

  /**
   * Generate a unique player ID (fallback only)
   */
  generateId() {
    return (
      "p_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }

  /**
   * Generate a human-friendly room code
   */
  generateRoomCode() {
    // Avoid confusing characters (0/O, 1/I/L)
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Host a new online game
   * @param {string} playerName - Host's display name
   * @param {number} playerCount - Number of players expected
   * @returns {Promise<string>} Room code
   */
  async hostGame(playerName, playerCount) {
    if (!this.isAvailable()) {
      throw new Error("Firebase not available");
    }

    this.roomCode = this.generateRoomCode();
    this.roomRef = this.db.ref(`games/${this.roomCode}`);
    this.isHost = true;
    this.isOnline = true;
    this.playerSlot = 0;
    this.playerName = playerName;
    this.connectedPlayers.clear();

    // Create room in Firebase
    // The playerId here is auth.uid, which is verified by Firebase
    await this.roomRef.set({
      settings: {
        playerCount,
        hostId: this.playerId,
        status: "waiting",
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      },
      players: {
        [this.playerId]: {
          name: playerName,
          slot: 0,
          connected: true,
          joinedAt: firebase.database.ServerValue.TIMESTAMP,
        },
      },
    });

    // Track ourselves
    this.connectedPlayers.set(this.playerId, {
      name: playerName,
      slot: 0,
      connected: true,
    });

    // Listen for player changes
    this.setupPlayerListeners();

    // Set up disconnect handling - automatically mark as disconnected
    this.roomRef
      .child(`players/${this.playerId}/connected`)
      .onDisconnect()
      .set(false);

    console.log("Hosted game:", this.roomCode);
    return this.roomCode;
  }

  /**
   * Join an existing game
   * @param {string} roomCode - Room code to join
   * @param {string} playerName - Player's display name
   * @returns {Promise<Object>} Room data
   */
  async joinGame(roomCode, playerName) {
    if (!this.isAvailable()) {
      throw new Error("Firebase not available");
    }

    this.roomCode = roomCode.toUpperCase().trim();
    this.roomRef = this.db.ref(`games/${this.roomCode}`);
    this.isOnline = true;
    this.isHost = false;
    this.playerName = playerName;
    this.connectedPlayers.clear();

    // Check if room exists
    const snapshot = await this.roomRef.once("value");
    if (!snapshot.exists()) {
      this.cleanup();
      throw new Error("roomNotFound");
    }

    const room = snapshot.val();
    if (room.settings.status !== "waiting") {
      this.cleanup();
      throw new Error("gameAlreadyStarted");
    }

    // Find next available slot
    const players = room.players || {};
    const takenSlots = new Set(Object.values(players).map((p) => p.slot));
    this.playerSlot = 0;
    while (takenSlots.has(this.playerSlot)) {
      this.playerSlot++;
    }

    if (this.playerSlot >= room.settings.playerCount) {
      this.cleanup();
      throw new Error("roomFull");
    }

    // Add self to room (using auth.uid as the key)
    await this.roomRef.child(`players/${this.playerId}`).set({
      name: playerName,
      slot: this.playerSlot,
      connected: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
    });

    // Load existing players
    for (const [pid, pdata] of Object.entries(players)) {
      this.connectedPlayers.set(pid, pdata);
    }
    this.connectedPlayers.set(this.playerId, {
      name: playerName,
      slot: this.playerSlot,
      connected: true,
    });

    // Set up listeners
    this.setupPlayerListeners();
    this.setupStateListener();

    // Set up disconnect handling
    this.roomRef
      .child(`players/${this.playerId}/connected`)
      .onDisconnect()
      .set(false);

    console.log("Joined game:", this.roomCode, "as slot", this.playerSlot);
    return room;
  }

  /**
   * Set up listeners for player join/leave
   */
  setupPlayerListeners() {
    // Player joined
    this.roomRef.child("players").on("child_added", (snapshot) => {
      const odPlayerId = snapshot.key;
      const playerData = snapshot.val();

      if (!this.connectedPlayers.has(odPlayerId)) {
        this.connectedPlayers.set(odPlayerId, playerData);
        this.game.onPlayerJoined(playerData);
      }
    });

    // Player updated (connected/disconnected)
    this.roomRef.child("players").on("child_changed", (snapshot) => {
      const odPlayerId = snapshot.key;
      const playerData = snapshot.val();
      this.connectedPlayers.set(odPlayerId, playerData);
      this.game.onPlayerUpdated(playerData);
    });

    // Player left
    this.roomRef.child("players").on("child_removed", (snapshot) => {
      const odPlayerId = snapshot.key;
      const playerData = this.connectedPlayers.get(odPlayerId);
      this.connectedPlayers.delete(odPlayerId);
      if (playerData) {
        this.game.onPlayerLeft(playerData);
      }
    });

    // Game status changed
    this.roomRef.child("settings/status").on("value", (snapshot) => {
      const status = snapshot.val();
      if (status === "playing" && !this.isHost) {
        this.game.onOnlineGameStarted();
      }
    });
  }

  /**
   * Set up listener for game state changes
   */
  setupStateListener() {
    this.roomRef.child("state").on("value", (snapshot) => {
      if (!snapshot.exists()) return;

      const state = snapshot.val();

      // Ignore our own updates
      if (state.lastUpdatedBy === this.playerId) return;

      // Ignore old updates
      if (state.timestamp && state.timestamp <= this.lastStateTimestamp) return;

      this.lastStateTimestamp = state.timestamp || 0;
      this.game.applyRemoteState(state);
    });
  }

  /**
   * Get list of connected players sorted by slot
   */
  getConnectedPlayersList() {
    return Array.from(this.connectedPlayers.values())
      .filter((p) => p.connected)
      .sort((a, b) => a.slot - b.slot);
  }

  /**
   * Get count of connected players
   */
  getConnectedCount() {
    return Array.from(this.connectedPlayers.values()).filter((p) => p.connected)
      .length;
  }

  /**
   * Check if room is full and ready to start
   */
  async isRoomReady() {
    if (!this.roomRef) return false;

    const snapshot = await this.roomRef.once("value");
    const room = snapshot.val();
    if (!room) return false;

    const connectedCount = this.getConnectedCount();
    return connectedCount >= room.settings.playerCount;
  }

  /**
   * Host starts the game
   */
  async startOnlineGame(gameState) {
    if (!this.isHost || !this.roomRef) return;

    // Update status to playing
    await this.roomRef.child("settings/status").set("playing");

    // Broadcast initial state
    await this.broadcastState(gameState);
  }

  /**
   * Broadcast game state to all players
   */
  async broadcastState(state) {
    if (!this.isOnline || !this.roomRef) return;

    try {
      await this.roomRef.child("state").set({
        ...state,
        lastUpdatedBy: this.playerId,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.error("Failed to broadcast state:", error);
      // Show user-friendly error if it's a permission error
      if (error.code === "PERMISSION_DENIED") {
        this.game.showMessage?.("Connection error - please rejoin", true);
      }
    }
  }

  /**
   * Send a game action and updated state
   */
  async sendAction(actionType, state) {
    if (!this.isOnline) return;
    await this.broadcastState(state);
  }

  /**
   * Check if it's this player's turn
   */
  isMyTurn() {
    if (!this.isOnline) return true;
    return this.game.currentPlayer === this.playerSlot;
  }

  /**
   * Get this player's slot index
   */
  getMySlot() {
    return this.playerSlot;
  }

  /**
   * Clean up Firebase references
   */
  cleanup() {
    if (this.roomRef) {
      this.roomRef.off();
    }
    this.roomRef = null;
    this.roomCode = null;
    this.isOnline = false;
    this.isHost = false;
    this.playerSlot = null;
    this.connectedPlayers.clear();
    this.lastStateTimestamp = 0;
  }

  /**
   * Leave the current game
   */
  async leaveGame() {
    if (this.roomRef && this.playerId) {
      try {
        await this.roomRef.child(`players/${this.playerId}`).remove();
      } catch (e) {
        console.warn("Failed to remove player from room:", e);
      }
    }
    this.cleanup();
  }

  /**
   * Delete room (host only)
   */
  async deleteRoom() {
    if (this.isHost && this.roomRef) {
      try {
        await this.roomRef.remove();
      } catch (e) {
        console.warn("Failed to delete room:", e);
      }
    }
    this.cleanup();
  }
}
