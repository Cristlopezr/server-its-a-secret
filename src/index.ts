import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { db } from './drizzle/db.js';
import { players } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import type { Room } from './interfaces/interfaces.js';

const rooms = new Map<string, Room>();

const io = new Server(Number(process.env.PORT) ?? 3001, {
    cors: {
        origin: ['http://localhost:3000'],
    },
});

io.on('connection', socket => {
    socket.on('create-room', payload => {
        const { username } = payload;
        const roomId = uuidv4();
        //8 digit code
        let code = Math.floor(10000000 + Math.random() * 90000000).toString();

        while (rooms.get(code)) {
            code = Math.floor(10000000 + Math.random() * 90000000).toString();
        }

        const room: Room = {
            id: roomId,
            code,
            players: [{ name: username, id: socket.id }],
            status: 'waiting',
        };

        console.log('Code', room.code);
        rooms.set(code, room);
        socket.join(room.id);
        socket.emit('room-created', {
            roomId: roomId,
        });
    });

    socket.on('enter-code', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            //retornar un emit sendNotification
            return `Room with code ${code} not found.`;
        }

        socket.emit('correct-code', { roomId: room.id });
    });

    socket.on('join-room', payload => {
        const { code, username: playerName } = payload;

        const room = rooms.get(code);

        if (!room) {
            return `Room with code ${code} not found.`;
        }

        const playerExists = room.players.find(({ id }) => id === socket.id);

        if (!playerExists) {
            room.players.push({
                id: socket.id,
                name: playerName,
            });
            socket.join(room.id);
        }
        console.log(room);
        rooms.set(room.code, room);
        socket.emit('joined-room', {
            roomId: room.id,
            players: room.players,
            roomStatus: room.status,
        });
    });
});
