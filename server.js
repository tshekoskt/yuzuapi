const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let groups = {};
let users = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    // Register user for private messaging
    socket.on('register', (username) => {
        users[username] = socket;
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('join group', (productNumber) => {
        if (!groups[productNumber]) {
            groups[productNumber] = [];
        }
        groups[productNumber].push(socket);
    });

    socket.on('leave group', (productNumber) => {
        if (groups[productNumber]) {
            groups[productNumber] = groups[productNumber].filter(s => s !== socket);
            if (groups[productNumber].length === 0) {
                delete groups[productNumber];
            }
        }
    });

    socket.on('group message', (data) => {
        const { productNumber, message } = data;
        if (groups[productNumber]) {
            groups[productNumber].forEach(s => s.emit('group message', { productNumber, message }));
        }
    });

    socket.on('private message', (data) => {
        const { to, message } = data;
        const recipientSocket = users[to];
        if (recipientSocket) {
            recipientSocket.emit('private message', { from: socket.id, message });
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        // Remove the socket from all groups
        for (let productNumber in groups) {
            groups[productNumber] = groups[productNumber].filter(s => s !== socket);
            if (groups[productNumber].length === 0) {
                delete groups[productNumber];
            }
        }
        // Remove from users map
        for (let username in users) {
            if (users[username] === socket) {
                delete users[username];
            }
        }
    });
});

server.listen(3001, () => {
    console.log('listening on *:3001');
});
