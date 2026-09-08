const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req,res)=> res.send('Party race socket server'));

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  function randomName() {
    const adjectives = ['Swift','Brave','Clever','Bright','Merry','Happy','Sunny','Bold','Quick','Kind'];
    const animals = ['Fox','Sparrow','Otter','Hawk','Panda','Whale','Koala','Tiger','Dolphin','Lynx'];
    const a = adjectives[Math.floor(Math.random() * adjectives.length)];
    const b = animals[Math.floor(Math.random() * animals.length)];
    return `${a}${b}`;
  }

  socket.on('joinRoom', ({room, name, party}) => {
    socket.join(room);
    const assignedName = (name && name.trim()) ? name.trim() : randomName();
    socket.data.player = { name: assignedName, party: party || [] };
    // broadcast updated roster
    const roster = Array.from(io.sockets.adapter.rooms.get(room) || []).map(id => ({ id, info: io.sockets.sockets.get(id).data.player || {} }));
    io.to(room).emit('roster', roster);
  });

  socket.on('startRace', ({room, state})=>{
    // only start if at least 2 connected players in the room
    const members = io.sockets.adapter.rooms.get(room) || new Set();
    if (members.size < 2) {
      socket.emit('errorMsg', { message: 'Need at least 2 players to start the race.' });
      return;
    }
    io.to(room).emit('raceStart', state || {});
  });

  socket.on('updateProgress', ({room, progress})=>{
    socket.to(room).emit('opponentProgress', { id: socket.id, progress });
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // notify rooms of updated roster
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      const roster = Array.from(io.sockets.adapter.rooms.get(room) || []).map(id => ({ id, info: io.sockets.sockets.get(id).data.player || {} }));
      io.to(room).emit('roster', roster);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening', PORT));
