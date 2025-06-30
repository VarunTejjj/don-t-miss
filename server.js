const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Mongoose fix
mongoose.set('strictQuery', true);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected");
}).catch(err => {
  console.error("❌ MongoDB error:", err);
});

// Schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Fetch all previous messages
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

// Handle incoming messages
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
