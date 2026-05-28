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
exports.ConsecrationController = void 0;
const common_1 = require("@nestjs/common");
const consecration_service_1 = require("./consecration.service");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
let ConsecrationController = class ConsecrationController {
    service;
    constructor(service) {
        this.service = service;
    }
    start(req, body) {
        const [y, m, d] = body.consecrationDate.split("-").map(Number);
        const startDate = new Date(y, m - 1, d, 12, 0, 0);
        startDate.setDate(startDate.getDate() - 33);
        return this.service.start(req.user.userId, startDate);
    }
    progress(req) {
        return this.service.progress(req.user.userId);
    }
    getDay(day) {
        return this.service.findDay(Number(day));
    }
    createStage(body) {
        return this.service.createStage(body);
    }
    createDay(body) {
        return this.service.createDay(body);
    }
    createPrayer(body) {
        return this.service.createPrayer(body);
    }
    addPrayerToDay(body) {
        return this.service.addPrayerToDay(body);
    }
    updateDayPrayer(id, body) {
        return this.service.updateDayPrayer(id, body.order);
    }
    updatePrayer(id, body) {
        return this.service.updatePrayer(id, body);
    }
    getAll() {
        return this.service.getFullConsecration();
    }
    today(req) {
        return this.service.today(req.user.userId);
    }
    reset(req) {
        return this.service.reset(req.user.userId);
    }
    complete(req, day) {
        return this.service.completeDay(req.user.userId, Number(day));
    }
    updateStartDate(req, body) {
        const [y, m, d] = body.consecrationDate.split("-").map(Number);
        const startDate = new Date(y, m - 1, d, 12, 0, 0);
        startDate.setDate(startDate.getDate() - 33);
        return this.service.updateStartDate(req.user.userId, startDate);
    }
    getStageDays(stageId) {
        return this.service.getStageDays(stageId);
    }
    uncompleteDay(req, day) {
        return this.service.uncompleteDay(req.user.userId, Number(day));
    }
    getAllDays() {
        return this.service.getAllDays();
    }
};
exports.ConsecrationController = ConsecrationController;
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "start", null);
__decorate([
    (0, common_1.Get)('progress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "progress", null);
__decorate([
    (0, common_1.Get)('day/:day'),
    __param(0, (0, common_1.Param)('day')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "getDay", null);
__decorate([
    (0, common_1.Post)('stage'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "createStage", null);
__decorate([
    (0, common_1.Post)('day'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "createDay", null);
__decorate([
    (0, common_1.Post)('prayer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "createPrayer", null);
__decorate([
    (0, common_1.Post)('day-prayer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "addPrayerToDay", null);
__decorate([
    (0, common_1.Put)('day-prayer/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "updateDayPrayer", null);
__decorate([
    (0, common_1.Put)('prayer/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "updatePrayer", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "today", null);
__decorate([
    (0, common_1.Post)('reset'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "reset", null);
__decorate([
    (0, common_1.Post)("complete/:day"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("day")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "complete", null);
__decorate([
    (0, common_1.Put)("consecration-date"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "updateStartDate", null);
__decorate([
    (0, common_1.Get)("stage/:stageId/days"),
    __param(0, (0, common_1.Param)("stageId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "getStageDays", null);
__decorate([
    (0, common_1.Delete)("complete/:day"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("day")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "uncompleteDay", null);
__decorate([
    (0, common_1.Get)("/all-days"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConsecrationController.prototype, "getAllDays", null);
exports.ConsecrationController = ConsecrationController = __decorate([
    (0, common_1.Controller)('oratio/consecration'),
    __metadata("design:paramtypes", [consecration_service_1.ConsecrationService])
], ConsecrationController);
//# sourceMappingURL=consecration.controller.js.map