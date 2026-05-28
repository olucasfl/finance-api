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
exports.CopaStandingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../modules/auth/jwt-auth.guard");
const admin_guard_1 = require("../admin/admin.guard");
const copa_standings_service_1 = require("./copa-standings.service");
let CopaStandingsController = class CopaStandingsController {
    standingsService;
    constructor(standingsService) {
        this.standingsService = standingsService;
    }
    getAllGroups() {
        return this.standingsService.getAllGroups();
    }
    getGroup(letter) {
        return this.standingsService.getGroupWithMatches(letter);
    }
    getThirds() {
        return this.standingsService.getThirdsRanking();
    }
    getQualified() {
        return this.standingsService.getQualified();
    }
    overridePositions(group, body) {
        return this.standingsService.overridePositions(group, body.positions);
    }
};
exports.CopaStandingsController = CopaStandingsController;
__decorate([
    (0, common_1.Get)('groups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CopaStandingsController.prototype, "getAllGroups", null);
__decorate([
    (0, common_1.Get)('groups/:letter'),
    __param(0, (0, common_1.Param)('letter')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CopaStandingsController.prototype, "getGroup", null);
__decorate([
    (0, common_1.Get)('standings/thirds'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CopaStandingsController.prototype, "getThirds", null);
__decorate([
    (0, common_1.Get)('standings/qualified'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CopaStandingsController.prototype, "getQualified", null);
__decorate([
    (0, common_1.Patch)('admin/standings/:group/positions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('group')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CopaStandingsController.prototype, "overridePositions", null);
exports.CopaStandingsController = CopaStandingsController = __decorate([
    (0, common_1.Controller)('cravou/copa'),
    __metadata("design:paramtypes", [copa_standings_service_1.CopaStandingsService])
], CopaStandingsController);
//# sourceMappingURL=copa-standings.controller.js.map