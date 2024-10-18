type status = 'waiting' | 'started';
type role = 'Admin' | 'Player';

export interface Player {
    id: string;
    name?: string;
    role: role;
}

export interface Room {
    id: string;
    code: string;
    status: status;
    players: Player[];
}
