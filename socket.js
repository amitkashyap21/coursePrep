const activeRooms = {};

function setupSocket(io) {
    io.on('connection', (socket) => {

        // --- SESSION RECOVERY ---
        socket.on('init-session', ({ roomId, username }) => {
            const room = activeRooms[roomId];
            if (room) {
                const member = room.members.find(m => m.username === username);
                if (member) {
                    member.id = socket.id; 
                    member.online = true;
                    socket.join(roomId);
                    console.log(`♻️  ${username} re-synced with Room ${roomId}`);
                    io.to(roomId).emit('update-room', room);
                }
            }
        });

        socket.on('create-room', ({ settings, username }) => {
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            activeRooms[roomId] = {
                id: roomId,
                adminName: username,
                settings: settings,
                members: [{ id: socket.id, username, score: 0, finished: false, online: true, exited: false }],
                status: 'waiting'
            };
            socket.join(roomId);
            socket.emit('room-created', roomId);
        });

        socket.on('join-room', ({ roomId, username }) => {
            const room = activeRooms[roomId];
            if (room && room.status === 'waiting') {
                const existing = room.members.find(m => m.username === username);
                if (!existing) {
                    room.members.push({ id: socket.id, username, score: 0, finished: false, online: true, exited: false });
                } else {
                    existing.id = socket.id;
                    existing.online = true;
                }
                socket.join(roomId);
                io.to(roomId).emit('update-room', room);
            }
        });

        socket.on('start-multiplayer-quiz', (roomId) => {
            const room = activeRooms[roomId];
            const sender = room?.members.find(m => m.id === socket.id);
            if (room && sender && room.adminName === sender.username) {
                room.status = 'playing';
                io.to(roomId).emit('quiz-starting', { settings: room.settings });
            }
        });

        socket.on('submit-multiplayer-score', ({ roomId, username, score }) => {
            const room = activeRooms[roomId];
            if (room) {
                const member = room.members.find(m => m.username === username);
                if (member) {
                    member.score = score;
                    member.finished = true;
                }
                io.to(roomId).emit('update-scores', room.members);
            }
        });

        // --- PLAYER EXIT LOGIC (Moved Inside) ---
        socket.on('player-exited', (roomId) => {
            const room = activeRooms[roomId];
            if (room) {
                const member = room.members.find(m => m.id === socket.id);
                if (member) {
                    member.exited = true; 
                    member.online = false;
                    console.log(`🚪 ${member.username} clicked exit in Room ${roomId}`);
                }

                const everyoneFinished = room.members.every(m => m.exited || !m.online);

                if (everyoneFinished) {
                    delete activeRooms[roomId];
                    console.log(`🧹 Room ${roomId} fully cleared and deleted.`);
                } else {
                    io.to(roomId).emit('update-scores', room.members);
                }
            }
        });

        socket.on('disconnect', () => {
            for (let id in activeRooms) {
                const room = activeRooms[id];
                const member = room.members.find(m => m.id === socket.id);
                if (member) {
                    member.online = false;
                    setTimeout(() => {
                        if (activeRooms[id]) {
                            const anyoneOnline = activeRooms[id].members.some(m => m.online);
                            if (!anyoneOnline) {
                                delete activeRooms[id];
                                console.log(`🗑️ Room ${id} deleted.`);
                            }
                        }
                    }, 15000); 
                }
            }
        });

    }); 
}

module.exports = { setupSocket, activeRooms };