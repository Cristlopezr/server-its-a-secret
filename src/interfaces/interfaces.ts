type status = 'waitingPlayers' | 'waitingSecrets' | 'started' | 'finished';
type role = 'Admin' | 'Player';

export interface Player {
    id: string;
    username?: string;
    role: role;
    score: number;
}

export interface Room {
    id: string;
    code: string;
    status: status;
    players: Player[];
    secrets: Secret[];
    maxPlayers: number;
}

interface Secret {
    playerId: string;
    secret: string;
}
