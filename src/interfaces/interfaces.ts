type status = 'waiting' | 'started' | 'finished';
type role = 'Admin' | 'Player';

export interface Player {
    id: string;
    name?: string;
    role: role;
    score: number;
}

export interface Room {
    id: string;
    code: string;
    status: status;
    players: Player[];
    secrets: Secret[];
}

interface Secret {
    id: string;
    playerId: string;
    secret: string;
}
