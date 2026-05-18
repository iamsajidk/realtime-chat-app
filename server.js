const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

// 1. Static files serve karne ke liye public folder ko link kiya
app.use(express.static(path.join(__dirname, 'public')));

// 2. Main route '/' par index.html file send karne ke liye setup
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Socket.io ki real-time chat coding
io.on('connection', (socket) => {
    console.log('Naya connection ID:', socket.id);

    socket.on('message', (msg) => {
        socket.broadcast.emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User chala gaya.');
    });
});

// 4. Server start karne ke liye code
http.listen(PORT, () => {
    console.log(`Server successfully listening on port ${PORT}`);
});