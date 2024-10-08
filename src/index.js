const { v4: uuidv4 } = require('uuid');
const { Server } = require('socket.io');

const io = new Server(process.env.PORT ?? 3001, {
    cors: {
        origin: ['http://localhost:3000'],
    },
});

io.on('connection', socket => {
    socket.on('create-room', () => {
        const room = uuidv4();
        //Crear room en la base de datos
        //enviar el id de la sala
    });
});
