import type { colors, icons } from '../constants.js';

type status = 'waitingPlayers' | 'waitingSecrets' | 'started' | 'finished';
type role = 'Admin' | 'Player';

export interface Player {
    id: string;
    username?: string;
    role: role;
    score: number;
    color: (typeof colors)[number];
    icon: (typeof icons)[number];
}

export interface Room {
    id: string;
    code: string;
    status: status;
    players: Player[];
    secrets: Secret[];
    maxPlayers: number;
    currentSecretIdx: number;
    roundStartTime?:number;
    scoresPublic: boolean;
}

interface Secret {
    playerId: string;
    secret: string;
}
