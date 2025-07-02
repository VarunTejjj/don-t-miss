const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Fix for strict query warnings
mongoose.set('strictQuery', true);

// Connect to MongoDB with retry logic
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("❌ Missing MONGODB_URI in .env");
  process.exit(1);
}

async function connectWithRetry(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4 // Prefer IPv4
      });
      console.log(`✅ MongoDB connected (attempt ${i})`);
      break;
    } catch (err) {
      console.error(`❌ Attempt ${i} failed:`, err.message);
      if (i === retries) process.exit(1);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

connectWithRetry();

// MongoDB connection events
mongoose.connection.on("error", err => console.error("❌ MongoDB error:", err));
mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));
mongoose.connection.on("reconnected", () => console.log("🔁 MongoDB reconnected"));

// Message Schema and Model
const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// API to fetch messages
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    console.log("📥 Sending messages to client:", messages.length);
    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Socket.io real-time chat
io.on('connection', (socket) => {
  console.log('🔌 User connected');

  socket.on('chat message', async (data) => {
    console.log("📤 Received message:", data);
    try {
      const newMsg = new Message(data);
      await newMsg.save();
      console.log("✅ Message saved to DB");
      io.emit('chat message', data);
    } catch (err) {
      console.error("❌ Failed to save message:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❎ User disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
