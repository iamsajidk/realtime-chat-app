const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } 
});
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ─── UPDATE: Render ke liye Dynamic Port Setup ───
// Render online chalne ke liye apna khud ka port deta hai. 
// Agar woh nahi milega, toh local me 3000 par chalega.
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// 1. MongoDB Connection
mongoose.connect('mongodb://localhost:27017/chatapp')
    .then(() => console.log("MongoDB se successfully connect ho gaye! 🍃"))
    .catch((err) => console.error("MongoDB connection error:", err));

// 2. Database Schemas
const chatSchema = new mongoose.Schema({
    room: String,
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// ─── HTTP ROUTES (SIGNUP & LOGIN) ───
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ success: false, message: "Username pehle se maujood hai!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ success: true, message: "Signup kamyab raha!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server me error." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ success: false, message: "User nahi mila!" });

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(400).json({ success: false, message: "Galat password!" });

        res.json({ success: true, username: user.username });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server me error." });
    }
});

// ─── SOCKET.IO ROOMS LOGIC ───
io.on('connection', (socket) => {
    console.log(`Naya connection ID: ${socket.id}`);

    // User jab room join karega
    socket.on('joinRoom', async ({ username, room }) => {
        socket.join(room);
        console.log(`${username} ne join kiya room: ${room}`);

        // Sirf isi room ki chat history nikaal kar bhejna
        try {
            const oldMessages = await Chat.find({ room }).sort({ timestamp: 1 });
            socket.emit('chatHistory', oldMessages); 
        } catch (err) {
            console.log("History load error:", err);
        }
    });

    // Message receive aur broadcast karna (Sirf us specific room me)
    socket.on('chatMessage', async (data) => {
        try {
            const newChat = new Chat({
                room: data.room,
                username: data.username,
                message: data.message
            });
            await newChat.save();

            io.to(data.room).emit('messageFromServer', newChat);
        } catch (err) {
            console.log("Message save error:", err);
        }
    });

    // Typing Indicators (Room specific)
    socket.on('typing', ({ username, room }) => {
        socket.to(room).emit('userTyping', username);
    });

    socket.on('stopTyping', (room) => {
        socket.to(room).emit('userStopTyping');
    });

    socket.on('disconnect', () => {
        console.log('User chala gaya.');
    });
});

// Server Start (Using dynamic PORT variable)
http.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT} 🚀`);
});