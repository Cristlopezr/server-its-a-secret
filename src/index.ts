import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { Server, Socket, type DefaultEventsMap } from 'socket.io';
import { db } from './drizzle/db.js';
import { players } from './drizzle/schema.js';
import { entityKind, eq } from 'drizzle-orm';
import type { Player, Room } from './lib/interfaces/interfaces.js';
import { getRandomItem, getRandomUnusedItem } from './helpers/getRandomItem.js';
import { colors, icons } from './lib/constants.js';

const rooms = new Map<string, Room>();

const MAX_POINTS = 1000;
const MAX_TIME = 15000;

const MAX_PLAYERS = 4;

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

        const admin: Player = { id: socket.id, role: 'Admin', score: 0, icon: getRandomItem(icons)!, color: getRandomItem(colors)! };
        const room: Room = {
            id: roomId,
            code,
            players: [admin],
            status: 'waitingPlayers',
            secrets: [],
            maxPlayers: MAX_PLAYERS,
            currentSecretIdx: 0,
        };

        rooms.set(code, room);
        socket.join(room.id);
        socket.emit('room-created', {
            room: room,
            player: admin,
        });
    });

    socket.on('join-room', payload => {
        const { code, username } = payload;

        const room = rooms.get(code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }

        const playerExists = room.players.find(({ id }) => id === socket.id);

        if (playerExists && !playerExists.username) {
            playerExists.username = username;
        }

        const usedIcons = room.players.map(player => player.icon);
        const usedColors = room.players.map(player => player.color);

        if (!playerExists) {
            room.players.push({
                id: socket.id,
                username: username,
                role: 'Player',
                score: 0,
                color: getRandomUnusedItem(usedIcons, colors),
                icon: getRandomUnusedItem(usedColors, icons),
            });
            socket.join(room.id);
        }

        rooms.set(room.code, room);
        socket.emit('joined-room');
        io.sockets.in(room.id).emit('update-users-in-room', {
            room: room,
        });
    });

    socket.on('enter-code', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }
        const usedIcons = room.players.map(player => player.icon);
        const usedColors = room.players.map(player => player.color);
        const player: Player = { id: socket.id, role: 'Player', score: 0, color: getRandomUnusedItem(usedColors, colors), icon: getRandomUnusedItem(usedIcons, icons) };

        room.players.push(player);
        socket.join(room.id);
        rooms.set(room.code, room);
        socket.emit('correct-code', { room: room, player: player });
    });

    socket.on('reveal-secrets', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }

        room.status = 'waitingSecrets';

        rooms.set(room.code, room);

        io.sockets.in(room.id).emit('waiting-secrets', {
            room: room,
        });
    });

    socket.on('submit-secret', payload => {
        const { code, secret } = payload;

        const room = rooms.get(code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }

        room.secrets.push({
            playerId: socket.id,
            secret: secret,
        });

        rooms.set(room.code, room);

        io.sockets.in(room.id).emit('secret-submitted', {
            room: room,
        });
    });

    socket.on('game-starts', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }

        room.status = 'started';
        room.secrets.sort(() => Math.random() - 0.5);

        rooms.set(room.code, room);

        io.sockets.in(room.id).emit('game-started', {
            room: room,
        });
        io.sockets.in(room.id).emit('round-waiting');
        createDelayTimer(room);
    });

    socket.on('new-round', payload => {
        const { code } = payload;
        const room = rooms.get(code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }
        io.sockets.in(room.id).emit('round-waiting');
        createDelayTimer(room);
    });

    socket.on('user-voted', payload => {
        const room = rooms.get(payload.code);

        if (!room) {
            sendNotification(socket, 'send-notification', "The game wasn't found");
            return;
        }

        const timeTaken = payload.endTime - room.roundStartTime!;

        const points = Math.max(0, MAX_POINTS - Math.floor((timeTaken / MAX_TIME) * MAX_POINTS));

        const player = room.players.find(({ id }) => id === socket.id);

        //!TODO:Retornar error
        if (!player) return;
        player.score += points;
        rooms.set(room.code, room);
        io.sockets.in(room.id).emit('updated-points', { room });
    });
});

const createDelayTimer = (room: Room) => {
    let timeRemaining = 5;

    const intervalId = setInterval(() => {
        timeRemaining -= 1;
        io.sockets.in(room.id).emit('delay-timer-update', {
            time: timeRemaining,
        });

        if (timeRemaining <= 0) {
            clearInterval(intervalId);
            room.roundStartTime = Date.now();
            createRoundTimer(room);
            io.sockets.in(room.id).emit('round-starts');
        }
    }, 1000);
};

const createRoundTimer = (room: Room) => {
    let timeRemaining = 15;

    const intervalId = setInterval(() => {
        timeRemaining -= 1;

        if (timeRemaining === 0) {
            room.currentSecretIdx = room.currentSecretIdx + 1;
            if (room.currentSecretIdx === room.secrets.length) {
                room.status = 'finished';
            }
            io.sockets.in(room.id).emit('time-is-up', { room: room });
        } else if (timeRemaining <= -3) {
            clearInterval(intervalId);
            io.sockets.in(room.id).emit('timer-ended');
        } else {
            io.sockets.in(room.id).emit('timer-update', {
                time: timeRemaining,
            });
        }
    }, 1000);
};

const sendNotification = (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, event: string, notification: string) => {
    socket.emit(event, { message: notification });
};
