import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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

  // ─── Grupos privados ──────────────────────────────────────────────────────

  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    client.join(`user:${userId}`);
  }

  emitGroupInviteReceived(inviteeId: string, payload: { inviteId: string; groupId: string; groupName: string; inviterName: string }) {
    this.server.to(`user:${inviteeId}`).emit('group:invite-received', payload);
  }

  // ─── Cravou Wrapped ───────────────────────────────────────────────────────

  emitWrappedActivatedTo(userId: string, activatedAt: string) {
    this.server.to(`user:${userId}`).emit('wrapped:activated', { activatedAt });
  }

  emitWrappedActivatedAll(activatedAt: string) {
    this.server.emit('wrapped:activated', { activatedAt });
  }

  emitWrappedDeactivated() {
    this.server.emit('wrapped:deactivated', {});
  }
}
