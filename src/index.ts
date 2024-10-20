import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { db } from './drizzle/db.js';
import { players } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import type { Player, Room } from './interfaces/interfaces.js';

const rooms = new Map<string, Room>();

const io = new Server(Number(process.env.PORT) ?? 3001, {
    cors: {
        origin: ['http://localhost:3000'],
    },
});

io.on('connection', socket => {
    socket.on('create-room', payload => {
        const roomId = uuidv4();
        //8 digit code
        let code = Math.floor(10000000 + Math.random() * 90000000).toString();

        while (rooms.get(code)) {
            code = Math.floor(10000000 + Math.random() * 90000000).toString();
        }

        const admin: Player = { id: socket.id, role: 'Admin', score: 0 };
        const room: Room = {
            id: roomId,
            code,
            players: [admin],
            status: 'waiting',
            secrets: [],
        };

        console.log('Code', room.code);
        rooms.set(code, room);
        socket.join(room.id);
        socket.emit('room-created', {
            roomId: roomId,
            code,
        });
    });

    socket.on('enter-code', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            console.log('HERE');
            socket.emit('send-notification', { message: "The game wasn't found" });
            return;
        }

        socket.emit('correct-code', { roomId: room.id, code });
    });

    socket.on('check-user-in-room', payload => {
        const { code, socketId } = payload;
        console.log({ code, socketId });
        const room = rooms.get(code);
        if (!room) {
            socket.emit('send-notification', { message: "The game wasn't found" });
            return;
        }
        const playerExists = room.players.find(({ id }) => id === socketId);

        console.log({ playerExists });
        if (playerExists?.role === 'Admin' && !playerExists.name) {
            socket.emit('user-checked', { isUserInRoom: false });
            return;
        }

        socket.emit('user-checked', { isUserInRoom: !!playerExists, player: playerExists });

        if (playerExists) {
            socket.emit('joined-room', {
                roomId: room.id,
                players: room.players,
                roomStatus: room.status,
            });
        }
    });

    socket.on('join-room', payload => {
        const { code, username: playerName, socketId } = payload;

        const room = rooms.get(code);

        if (!room) {
            socket.emit('send-notification', { message: "The game wasn't found" });
            return;
        }

        const playerExists = room.players.find(({ id }) => id === socketId);

        if (playerExists?.role === 'Admin' && !playerExists.name) {
            playerExists.name = playerName;
        }

        if (!playerExists) {
            room.players.push({
                id: socketId,
                name: playerName,
                role: 'Player',
                score: 0,
            });
            socket.join(room.id);
        }

        console.log(room);
        rooms.set(room.code, room);
        io.sockets.in(room.id).emit('joined-room', {
            roomId: room.id,
            players: room.players,
            room: room,
        });
    });
});
