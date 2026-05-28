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
exports.MatchesAdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../modules/auth/jwt-auth.guard");
const admin_guard_1 = require("../admin/admin.guard");
const scoring_service_1 = require("../scoring/scoring.service");
const create_match_dto_1 = require("./dto/create-match.dto");
const finalize_match_dto_1 = require("./dto/finalize-match.dto");
const update_match_date_dto_1 = require("./dto/update-match-date.dto");
const update_match_score_dto_1 = require("./dto/update-match-score.dto");
const update_match_status_dto_1 = require("./dto/update-match-status.dto");
const matches_service_1 = require("./matches.service");
let MatchesAdminController = class MatchesAdminController {
    matchesService;
    scoringService;
    constructor(matchesService, scoringService) {
        this.matchesService = matchesService;
        this.scoringService = scoringService;
    }
    importMatches() {
        return this.matchesService.importMatches();
    }
    create(dto) {
        return this.matchesService.createMatch(dto);
    }
    createBulk(body) {
        return this.matchesService.createMatchesBulk(body.matches);
    }
    findAll() {
        return this.matchesService.findAll();
    }
    updateScore(id, dto) {
        return this.matchesService.updateScore(id, dto);
    }
    updateStatus(id, dto) {
        return this.matchesService.updateStatus(id, dto);
    }
    reprocess(id) {
        return this.scoringService.reprocessMatch(id);
    }
    lock(id) {
        return this.matchesService.lockMatch(id);
    }
    finalize(id, dto) {
        return this.matchesService.finalizeMatch(id, dto);
    }
    updateDate(id, dto) {
        return this.matchesService.updateMatchDate(id, dto);
    }
    resetMatch(id) {
        return this.matchesService.resetMatch(id);
    }
    unlockMatch(id) {
        return this.matchesService.unlockMatch(id);
    }
    remove(id) {
        return this.matchesService.removeMatch(id);
    }
};
exports.MatchesAdminController = MatchesAdminController;
__decorate([
    (0, common_1.Post)('import-matches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "importMatches", null);
__decorate([
    (0, common_1.Post)('matches'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_match_dto_1.CreateMatchDto]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('matches/bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "createBulk", null);
__decorate([
    (0, common_1.Get)('matches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)('matches/:id/score'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_match_score_dto_1.UpdateMatchScoreDto]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "updateScore", null);
__decorate([
    (0, common_1.Patch)('matches/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_match_status_dto_1.UpdateMatchStatusDto]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('matches/:id/reprocess'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "reprocess", null);
__decorate([
    (0, common_1.Post)('matches/:id/lock'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "lock", null);
__decorate([
    (0, common_1.Post)('matches/:id/finalize'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, finalize_match_dto_1.FinalizeMatchDto]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "finalize", null);
__decorate([
    (0, common_1.Patch)('matches/:id/date'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_match_date_dto_1.UpdateMatchDateDto]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "updateDate", null);
__decorate([
    (0, common_1.Post)('matches/:id/reset'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "resetMatch", null);
__decorate([
    (0, common_1.Post)('matches/:id/unlock'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "unlockMatch", null);
__decorate([
    (0, common_1.Delete)('matches/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MatchesAdminController.prototype, "remove", null);
exports.MatchesAdminController = MatchesAdminController = __decorate([
    (0, common_1.Controller)('cravou/admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [matches_service_1.MatchesService,
        scoring_service_1.ScoringService])
], MatchesAdminController);
//# sourceMappingURL=matches.admin.controller.js.map