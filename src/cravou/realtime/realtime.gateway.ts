import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/cravou' })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  emitMatchUpdated(match: object) {
    this.server.emit('match:updated', match);
  }

  emitMatchLocked(matchId: string) {
    this.server.emit('match:locked', { matchId });
  }

  emitRankingUpdated() {
    this.server.emit('ranking:updated', {});
  }
}
