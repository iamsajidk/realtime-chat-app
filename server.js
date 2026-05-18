const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Models (created in /models)
const User = require('./models/User');
const Message = require('./models/Message');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes for signup/login used by the client
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ success: false, message: 'Missing fields' });

        const exists = await User.findOne({ username });
        if (exists) return res.json({ success: false, message: 'Username already taken' });

        const hash = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hash });
        await user.save();
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ success: false, message: 'Missing fields' });

        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.json({ success: false, message: 'Invalid credentials' });

        return res.json({ success: true, username: user.username });
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: 'Server error' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io handlers: rooms, messages, typing indicators
io.on('connection', (socket) => {
    console.log('New connection ID:', socket.id);

    socket.on('joinRoom', async ({ username, room }) => {
        try {
            socket.join(room);
            socket.username = username;
            socket.room = room;

            // Send recent history (last 200 messages)
            const history = await Message.find({ room }).sort({ timestamp: 1 }).limit(200).lean();
            socket.emit('chatHistory', history.map(h => ({ username: h.username, message: h.message, timestamp: h.timestamp })));

            // Notify others in room
            socket.to(room).emit('messageFromServer', { username: 'System', message: `${username} joined the room.`, timestamp: new Date() });
        } catch (err) { console.error('joinRoom error', err); }
    });

    socket.on('chatMessage', async (data) => {
        try {
            const { room, username, message } = data;
            const msg = new Message({ room, username, message });
            await msg.save();

            io.to(room).emit('messageFromServer', { username, message, timestamp: msg.timestamp });
        } catch (err) { console.error('chatMessage error', err); }
    });

    socket.on('typing', ({ username, room }) => {
        if (room) socket.to(room).emit('userTyping', username);
    });

    socket.on('stopTyping', (room) => {
        if (room) socket.to(room).emit('userStopTyping');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.room && socket.username) {
            socket.to(socket.room).emit('messageFromServer', { username: 'System', message: `${socket.username} left the room.`, timestamp: new Date() });
        }
    });
});

http.listen(PORT, () => {
    console.log(`Server successfully listening on port ${PORT}`);
});