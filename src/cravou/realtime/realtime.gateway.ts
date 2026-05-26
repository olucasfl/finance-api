import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/cravou' })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  // ─── Bolão ────────────────────────────────────────────────────────────────

  emitMatchUpdated(match: object) {
    this.server.emit('match:updated', match);
  }

  emitMatchLocked(matchId: string) {
    this.server.emit('match:locked', { matchId });
  }

  emitRankingUpdated() {
    this.server.emit('ranking:updated', {});
  }

  // ─── Torneio ──────────────────────────────────────────────────────────────

  emitGroupClassified(group: string, standings: object[]) {
    this.server.emit('group:classified', { group, standings });
  }

  emitAllGroupsComplete() {
    this.server.emit('tournament:all-groups-complete', {});
  }

  emitThirdsSelected(qualifiers: object[]) {
    this.server.emit('bracket:thirds-selected', { qualifiers });
  }

  emitBracketUpdated(round: string, slots: object[]) {
    this.server.emit('bracket:updated', { round, slots });
  }
}
