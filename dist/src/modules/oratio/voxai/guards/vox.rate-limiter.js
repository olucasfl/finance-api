"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoxRateLimiter = void 0;
const common_1 = require("@nestjs/common");
let VoxRateLimiter = class VoxRateLimiter {
    requests = new Map();
    check(userId) {
        const now = Date.now();
        const window = 60 * 1000;
        const limit = 5;
        if (!this.requests.has(userId)) {
            this.requests.set(userId, []);
        }
        const timestamps = this.requests.get(userId);
        const filtered = timestamps.filter(t => now - t < window);
        if (filtered.length >= limit) {
            return {
                allowed: false,
                message: "Você atingiu o limite de perguntas por minuto. Aguarde alguns instantes."
            };
        }
        filtered.push(now);
        this.requests.set(userId, filtered);
        return { allowed: true };
    }
};
exports.VoxRateLimiter = VoxRateLimiter;
exports.VoxRateLimiter = VoxRateLimiter = __decorate([
    (0, common_1.Injectable)()
], VoxRateLimiter);
//# sourceMappingURL=vox.rate-limiter.js.map