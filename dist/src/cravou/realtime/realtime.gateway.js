"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let RealtimeGateway = class RealtimeGateway {
    server;
    emitMatchUpdated(match) {
        this.server.emit('match:updated', match);
    }
    emitMatchLocked(matchId) {
        this.server.emit('match:locked', { matchId });
    }
    emitRankingUpdated() {
        this.server.emit('ranking:updated', {});
    }
    emitGroupClassified(group, standings) {
        this.server.emit('group:classified', { group, standings });
    }
    emitAllGroupsComplete() {
        this.server.emit('tournament:all-groups-complete', {});
    }
    emitThirdsSelected(qualifiers) {
        this.server.emit('bracket:thirds-selected', { qualifiers });
    }
    emitBracketUpdated(round, slots) {
        this.server.emit('bracket:updated', { round, slots });
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
exports.RealtimeGateway = RealtimeGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' }, namespace: '/cravou' })
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map