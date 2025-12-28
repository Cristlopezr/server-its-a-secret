import 'dotenv/config';
/* import { db } from './drizzle/db.js';
import { players } from './drizzle/schema.js';
import { entityKind, eq } from 'drizzle-orm'; */
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Server, Socket, type DefaultEventsMap } from 'socket.io';
import type { Player, Room } from './lib/interfaces/interfaces.js';
import { getRandomItem, getRandomUnusedItem } from './helpers/getRandomItem.js';
import { colors, icons } from './lib/constants.js';

const rooms = new Map<string, Room>();

const MAX_POINTS = 1000;
const MAX_TIME = 15000;

const MAX_PLAYERS = 4;

const app = express();
const httpServer = createServer(app);

app.use(
    cors({
        origin: [process.env.APP_URL as string],
        credentials: true,
    })
);

function parseCookie(str: string) {
    if (!str) {
        return {};
    }
    return str.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=').map(item => item.trim());
        if (key && value) {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, string>);
}

app.use(cookieParser());

app.post('/api/session', (req, res) => {
    let sessionId = req.cookies['its-a-secret-session'];

    if (!sessionId) {
        sessionId = uuidv4();
        res.cookie('its-a-secret-session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });
    }

    res.json({ ok: true, message: 'Session created' });
});

const io = new Server(httpServer, {
    cors: {
        origin: [process.env.APP_URL as string],
        credentials: true,
    },
});

io.use((socket, next) => {
    const cookieHeader = socket?.handshake?.headers?.cookie || '';

    const sessionId = parseCookie(cookieHeader)['its-a-secret-session'];

    if (sessionId) {
        socket.data.sessionId = sessionId;
        return next();
    }
    return next(new Error('No session found'));
});

io.on('connection', socket => {
    socket.on('disconnect', () => {
        for (const room of rooms.values()) {
            const disconnectedPlayer = room.players.find(player => player.id === socket.data.sessionId);
            if (disconnectedPlayer) {
                socket.leave(room.id);

                // Check if disconnected player was admin
                if (disconnectedPlayer.role === 'Admin' && room.players.length > 1) {
                    // Assign admin role to next player
                    const nextPlayer = room.players.find(player => player.id !== socket.data.sessionId);
                    if (nextPlayer) {
                        nextPlayer.role = 'Admin';
                    }
                }

                // Remove disconnected player
                room.players = room.players.filter(player => player.id !== socket.data.sessionId);
                io.to(room.id).emit('update-users-in-room', {
                    room: room,
                });
                // Delete room if empty
                if (room.players.length === 0) {
                    rooms.delete(room.code);
                }
            }
        }
    });

    socket.on('create-room', callback => {
        const roomId = uuidv4();
        //6 digit code
        let code = Math.floor(100000 + Math.random() * 900000).toString();

        while (rooms.get(code)) {
            code = Math.floor(100000 + Math.random() * 900000).toString();
        }
        const admin: Player = {
            id: socket.data.sessionId,
            role: 'Admin',
            score: 0,
            icon: getRandomItem(icons)!,
            color: getRandomItem(colors)!,
        };
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
        console.log({ roomsInCreateRoom: rooms });
        socket.join(room.id);
        socket.emit('room-created', {
            room: room,
            player: admin,
        });
        callback({
            ok: true,
        });
    });

    socket.on('join-room', (payload, callback) => {
        const { code, username } = payload;

        const room = rooms.get(code);

        if (!room) {
            callback({ message: 'Oops! Room not found', ok: false });
            return;
        }

        if (room.status !== 'waitingPlayers') {
            callback({
                message: "The game is already in progress and can't accept new players.",
                ok: false,
                type: 'game-started',
            });
            return;
        }

        const playerExists = room.players.find(({ id }) => id === socket.data.sessionId);

        if (playerExists && !playerExists.username) {
            playerExists.username = username;
        }

        const usedIcons = room.players.map(player => player.icon);
        const usedColors = room.players.map(player => player.color);

        if (!playerExists) {
            room.players.push({
                id: socket.data.sessionId,
                username: username,
                role: 'Player',
                score: 0,
                color: getRandomUnusedItem(usedIcons, colors),
                icon: getRandomUnusedItem(usedColors, icons),
            });
        }
        socket.join(room.id);
        socket.emit('joined-room');
        io.to(room.id).emit('update-users-in-room', {
            room: room,
        });
        callback({
            ok: true,
        });
    });

    socket.on('enter-code', (payload, callback) => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            callback({ message: 'Oops! Room not found', ok: false });
            return;
        }

        if (room.status !== 'waitingPlayers') {
            callback({ message: "The game is already in progress and can't accept new players.", ok: false });
            return;
        }

        const usedIcons = room.players.map(player => player.icon);
        const usedColors = room.players.map(player => player.color);
        const player: Player = {
            id: socket.data.sessionId,
            role: 'Player',
            score: 0,
            color: getRandomUnusedItem(usedColors, colors),
            icon: getRandomUnusedItem(usedIcons, icons),
        };

        room.players.push(player);
        socket.join(room.id);
        socket.emit('correct-code', { room: room, player: player });
        callback({
            ok: true,
        });
    });

    socket.on('reveal-secrets', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            return;
        }

        room.status = 'waitingSecrets';

        io.to(room.id).emit('waiting-secrets', {
            room: room,
        });
    });

    socket.on('submit-secret', payload => {
        const { code, secret } = payload;

        const room = rooms.get(code);

        if (!room) {
            return;
        }

        room.secrets.push({
            playerId: socket.data.sessionId,
            secret: secret,
        });

        io.to(room.id).emit('secret-submitted', {
            room: room,
        });
    });

    socket.on('game-starts', payload => {
        const { code } = payload;

        const room = rooms.get(code);

        if (!room) {
            return;
        }

        room.status = 'started';
        room.secrets.sort(() => Math.random() - 0.5);

        io.to(room.id).emit('game-started', {
            room: room,
        });
        io.to(room.id).emit('round-waiting');
        createDelayTimer(room);
    });

    /*  socket.on('new-round', payload => {
        const { code } = payload;
        const room = rooms.get(code);

        if (!room) {
            return;
        }
        
        createDelayTimer(room);
    }); */

    socket.on('user-voted', payload => {
        const room = rooms.get(payload.code);

        if (!room) {
            return;
        }

        const timeTaken = payload.endTime - room.roundStartTime!;

        const points = Math.max(0, MAX_POINTS - Math.floor((timeTaken / MAX_TIME) * MAX_POINTS));

        const player = room.players.find(({ id }) => id === socket.data.sessionId);

        //!TODO:Retornar error
        if (!player) return;
        player.score += points;
        io.to(room.id).emit('updated-points', { room });
    });
});

const PORT = Number(process.env.PORT) ?? 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const createDelayTimer = (room: Room) => {
    let timeRemaining = 5;

    const intervalId = setInterval(() => {
        timeRemaining -= 1;
        io.to(room.id).emit('delay-timer-update', {
            time: timeRemaining,
        });

        if (timeRemaining <= 0) {
            clearInterval(intervalId);
            room.roundStartTime = Date.now();
            createRoundTimer(room);
            io.to(room.id).emit('round-starts');
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
                clearInterval(intervalId);
                io.to(room.id).emit('time-is-up', { status: room.status, currentSecretIdx: room.currentSecretIdx });
                return;
            }
            io.to(room.id).emit('time-is-up', { status: room.status, currentSecretIdx: room.currentSecretIdx });
        } else if (timeRemaining <= -3) {
            clearInterval(intervalId);
            io.to(room.id).emit('timer-ended');
            io.to(room.id).emit('round-waiting');
            createDelayTimer(room);
        } else {
            io.to(room.id).emit('timer-update', {
                time: timeRemaining,
            });
        }
    }, 1000);
};

const sendNotification = (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    event: string,
    notification: string
) => {
    socket.emit(event, { message: notification });
};
