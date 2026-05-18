const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;
const rooms = {};

app.use(express.static('src'));

io.on('connection', socket => {
  socket.on('create-room', data => {
    const roomId = data.roomId || Math.random().toString(36).slice(2, 8);
    rooms[roomId] = rooms[roomId] || { players: {}, hostId: socket.id };
    rooms[roomId].hostId = socket.id;
    joinRoom(socket, roomId, data.name, data.char);
    socket.emit('room-created', { roomId });
  });

  socket.on('join-room', data => {
    const roomId = data.roomId;
    if (!roomId || !rooms[roomId]) {
      socket.emit('room-error', { message: 'ルームが見つかりません。' });
      return;
    }
    joinRoom(socket, roomId, data.name, data.char);
  });

  socket.on('start-game', data => {
    const roomId = data.roomId;
    if (!roomId || !rooms[roomId] || rooms[roomId].hostId !== socket.id) return;
    io.to(roomId).emit('start-game', { roomId });
  });

  socket.on('player-action', data => {
    const roomId = data.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];
    if (socket.id === room.hostId) {
      io.to(roomId).emit('player-action', data);
    } else {
      io.to(room.hostId).emit('player-action', data);
    }
  });

  socket.on('send-game-state', data => {
    const roomId = data.roomId;
    if (!roomId || !rooms[roomId]) return;
    io.to(roomId).emit('game-state', data.gameState);
  });

  socket.on('disconnect', () => {
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomId).emit('room-state', { players: Object.values(room.players) });
        if (room.hostId === socket.id) {
          const remaining = Object.keys(room.players);
          room.hostId = remaining[0] || null;
          if (room.hostId) {
            io.to(roomId).emit('host-changed', { hostId: room.hostId });
          }
        }
        if (Object.keys(room.players).length === 0) {
          delete rooms[roomId];
        }
      }
    }
  });
});

function joinRoom(socket, roomId, name, char) {
  socket.join(roomId);
  const room = rooms[roomId];
  room.players[socket.id] = {
    id: socket.id,
    name: name || 'Player',
    char: char || '剣士',
    isHost: room.hostId === socket.id
  };
  io.to(roomId).emit('room-state', { players: Object.values(room.players), hostId: room.hostId });
}

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
