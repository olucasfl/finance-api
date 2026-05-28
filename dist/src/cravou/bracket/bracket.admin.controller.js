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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BracketAdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../modules/auth/jwt-auth.guard");
const admin_guard_1 = require("../admin/admin.guard");
const bracket_service_1 = require("./bracket.service");
let BracketAdminController = class BracketAdminController {
    bracketService;
    constructor(bracketService) {
        this.bracketService = bracketService;
    }
    initializeAll() {
        return this.bracketService.initializeAllSlots();
    }
    mountR32() {
        return this.bracketService.mountR32();
    }
    setResult(slotId, body) {
        return this.bracketService.setKnockoutResult(slotId, body.winnerTeam);
    }
    overrideTeams(slotId, body) {
        return this.bracketService.overrideSlotTeams(slotId, body);
    }
    syncR32Teams() {
        return this.bracketService.refreshR32TeamsFromStandings();
    }
    resetResult(slotId) {
        return this.bracketService.resetKnockoutResult(slotId);
    }
    createMatch(slotId, body) {
        return this.bracketService.createMatchFromSlot(slotId, body.matchDate);
    }
};
exports.BracketAdminController = BracketAdminController;
__decorate([
    (0, common_1.Post)('initialize-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "initializeAll", null);
__decorate([
    (0, common_1.Post)('mount-r32'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "mountR32", null);
__decorate([
    (0, common_1.Post)(':slotId/result'),
    __param(0, (0, common_1.Param)('slotId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "setResult", null);
__decorate([
    (0, common_1.Patch)(':slotId/teams'),
    __param(0, (0, common_1.Param)('slotId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "overrideTeams", null);
__decorate([
    (0, common_1.Post)('sync-r32-teams'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "syncR32Teams", null);
__decorate([
    (0, common_1.Post)(':slotId/reset-result'),
    __param(0, (0, common_1.Param)('slotId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "resetResult", null);
__decorate([
    (0, common_1.Post)(':slotId/create-match'),
    __param(0, (0, common_1.Param)('slotId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BracketAdminController.prototype, "createMatch", null);
exports.BracketAdminController = BracketAdminController = __decorate([
    (0, common_1.Controller)('cravou/admin/bracket'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [bracket_service_1.BracketService])
], BracketAdminController);
//# sourceMappingURL=bracket.admin.controller.js.map