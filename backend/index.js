const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;

app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const rooms = {};

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Video Sync Server!');
});

app.post('/upload', upload.single('video'), (req, res) => {
  const videoPath = `/uploads/${req.file.filename}`;
  const { roomId } = req.body;

  console.log(`Video uploaded for room: ${roomId}`);
  console.log(`Video path: ${videoPath}`);

  if (roomId && rooms[roomId]) {
    rooms[roomId].videoPath = videoPath;
    io.to(roomId).emit('video-updated', { videoPath });
  }

  res.status(200).json({ videoPath });
});

app.post('/create-room', (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 8);
  rooms[roomId] = { clients: [], currentTime: 0, isPlaying: false, videoPath: '' };

  console.log(`Room created: ${roomId}`);

  res.status(200).json({ roomId });
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join-room', ({ roomId }) => {
    console.log(`User ${socket.id} is joining room: ${roomId}`);

    if (!rooms[roomId]) {
      console.log(`Room ${roomId} doesn't exist`);
      return;
    }

    rooms[roomId].clients.push(socket.id);
    socket.join(roomId);

    const room = rooms[roomId];
    console.log(`Syncing room: ${roomId} with currentTime: ${room.currentTime}, isPlaying: ${room.isPlaying}`);

    socket.emit('sync', {
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      videoPath: room.videoPath,
    });

    socket.to(roomId).emit('new-user', { socketId: socket.id });
  });

  socket.on('video-uploaded', ({ roomId, videoPath }) => {
    console.log(`Video uploaded for room: ${roomId}`);
    if (!rooms[roomId]) return;

    rooms[roomId].videoPath = videoPath;

    io.to(roomId).emit('video-updated', { videoPath });
  });

  socket.on('play', ({ roomId, currentTime }) => {
    console.log(`Play event received for room: ${roomId} at time: ${currentTime}`);

    const room = rooms[roomId];
    if (!room) return;

    room.currentTime = currentTime;
    room.isPlaying = true;

    socket.broadcast.to(roomId).emit('play', { currentTime });
  });

  socket.on('pause', ({ roomId, currentTime }) => {
    console.log(`Pause event received for room: ${roomId} at time: ${currentTime}`);

    const room = rooms[roomId];
    if (!room) return;

    room.currentTime = currentTime;
    room.isPlaying = false;

    socket.broadcast.to(roomId).emit('pause', { currentTime });
  });

  socket.on('seek', ({ roomId, currentTime }) => {
    console.log(`Seek event received for room: ${roomId} to time: ${currentTime}`);

    const room = rooms[roomId];
    if (!room) return;

    room.currentTime = currentTime;

    socket.broadcast.to(roomId).emit('seek', { currentTime });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.clients.indexOf(socket.id);
      if (index > -1) {
        room.clients.splice(index, 1);  
        console.log(`User ${socket.id} removed from room: ${roomId}`);
      }
    }
  });

socket.on('leave-room', ({ roomId }) => {
  console.log(`User ${socket.id} is leaving room: ${roomId}`);

  if (!rooms[roomId]) return;

  const index = rooms[roomId].clients.indexOf(socket.id);
  if (index > -1) {
    rooms[roomId].clients.splice(index, 1);
    console.log(`User ${socket.id} removed from room: ${roomId}`);
  }

  socket.to(roomId).emit('user-left', { socketId: socket.id });

  if (rooms[roomId].clients.length === 0) {
    delete rooms[roomId];
    console.log(`Room ${roomId} deleted because it is empty`);
  }

  socket.leave(roomId);
});

});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});