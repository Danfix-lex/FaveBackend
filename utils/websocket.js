// utils/websocket.js

/**
 * Emit a real-time update to all connected fans when an artist lists a song
 * @param {Object} io - Socket.IO instance
 * @param {Object} songData - The song data to send to fans
 */
export const emitSongListed = (io, songData) => {
  // Emit to all connected fans
  io.emit('songListed', songData);
  console.log('Emitted songListed event:', songData);
};

/**
 * Emit a real-time update to a specific fan
 * @param {Object} io - Socket.IO instance
 * @param {string} fanId - The fan ID to send the update to
 * @param {Object} data - The data to send
 * @param {string} event - The event name
 */
export const emitToFan = (io, fanId, data, event = 'update') => {
  io.to(fanId).emit(event, data);
  console.log(`Emitted ${event} event to fan ${fanId}:`, data);
};

/**
 * Emit a real-time update to all fans following a specific artist
 * @param {Object} io - Socket.IO instance
 * @param {string} artistId - The artist ID
 * @param {Object} data - The data to send
 * @param {string} event - The event name
 */
export const emitToArtistFollowers = (io, artistId, data, event = 'artistUpdate') => {
  // In a real implementation, you would query the database to find fans following this artist
  // For now, we'll emit to all connected fans
  io.emit(event, { artistId, ...data });
  console.log(`Emitted ${event} event for artist ${artistId}:`, data);
};

export default {
  emitSongListed,
  emitToFan,
  emitToArtistFollowers
};