const express = require('express');
const http = require('http');
const {Server} = require ('socket.io');

const app=express();
const server =http.createServer(app);
const io = new Server(server)

app.use(express.static('public'));
let users = new Map();

io.on('connection', (socket)=>{
    console.log("User with ID ;- " + socket.id + "is connected...");
    io.emit('users-count',users.size);
    socket.on('new-users-join',(username)=>{
        users.set(socket.id,username);
        socket.emit('users-count', users.size);

    });
    socket.on('send-message', (message)=>{
        let username = users.get(socket.id);
        io.emit('receive-message',{username,message});
    });

    socket.on('start-typing',()=>{
        let username = users.get(socket.id);
        socket.broadcast.emit('typing', {username});
    });

    socket.on('stop-typing',()=>{
        io.emit('typing-stop');
    });

    socket.on('disconnect', ()=>{
        console.log("User With ID :- "+socket.id+" is disconnected...");
    });
})

server.listen(4000,()=>{
    console.log("Server is running on port 4000");
})
