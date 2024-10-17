import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { db } from './drizzle/db.js';
import { players } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

interface Player {
    id: string;
    name: string;
}

interface Room {
    id: string;
    code: number;
    players: Player[];
}

//rooms
new Set();

const io = new Server(Number(process.env.PORT) ?? 3001, {
    cors: {
        origin: ['http://localhost:3000'],
    },
});

io.on('connection', socket => {
    socket.on('create-room', async () => {
        const room = uuidv4();

        //insertar room en el set
        /* id: room,
        code: Math.floor(100000 + Math.random() * 900000) */

        socket.emit('room-created', {
            roomId: room,
        });
    });

    socket.on('join-room', async payload => {
        const room = payload.roomId;

        //añadir player al room en el set
        await db.insert(players).values({
            id: socket.id,
            name: payload.name,
        });
    });
});
