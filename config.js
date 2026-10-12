// Optional settings, loaded before the game. Safe to leave as is.
//
// Online rooms connect players directly (WebRTC). Most networks work out of the box.
// If friends on strict networks (some mobile carriers) cannot join, add a TURN relay:
//
// window.GTP_ICE = [
//   { urls: "stun:stun.l.google.com:19302" },
//   { urls: "turn:YOUR_TURN_HOST:443", username: "YOUR_USER", credential: "YOUR_PASSWORD" }
// ];
