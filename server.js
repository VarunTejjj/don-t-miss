const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Fix Mongoose deprecation warning
mongoose.set('strictQuery', true);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ Connected to MongoDB");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Define Message schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Fetch previous messages
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Socket.IO real-time chat
io.on('connection', (socket) => {
  console.log('🔌 A user connected.');

  socket.on('chat message', async (data) => {
    try {
      const newMsg = new Message(data);
      await newMsg.save();
      io.emit('chat message', data); // broadcast to everyone
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❎ A user disconnected.');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
