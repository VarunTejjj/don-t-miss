const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// REST API to get previous messages
app.get('/messages', async (req, res) => {
  const messages = await Message.find().sort({ timestamp: 1 });
  res.json(messages);
});

// Socket.IO chat logic
io.on('connection', (socket) => {
  console.log('A user connected.');

  socket.on('chat message', async (data) => {
    const newMsg = new Message(data);
    await newMsg.save();

    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected.');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
