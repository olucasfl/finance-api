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
exports.RosaryController = void 0;
const common_1 = require("@nestjs/common");
const rosary_service_1 = require("./rosary.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let RosaryController = class RosaryController {
    service;
    constructor(service) {
        this.service = service;
    }
    session(req) {
        return this.service.getSession(req.user.userId);
    }
    start(req) {
        return this.service.start(req.user.userId);
    }
    next(req) {
        return this.service.nextStep(req.user.userId);
    }
    finish(req) {
        return this.service.finish(req.user.userId);
    }
    getRosary(type) {
        return this.service.getRosary(type);
    }
};
exports.RosaryController = RosaryController;
__decorate([
    (0, common_1.Get)("session"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RosaryController.prototype, "session", null);
__decorate([
    (0, common_1.Post)("start"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RosaryController.prototype, "start", null);
__decorate([
    (0, common_1.Post)("next"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RosaryController.prototype, "next", null);
__decorate([
    (0, common_1.Post)("finish"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RosaryController.prototype, "finish", null);
__decorate([
    (0, common_1.Get)(":type"),
    __param(0, (0, common_1.Param)("type")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RosaryController.prototype, "getRosary", null);
exports.RosaryController = RosaryController = __decorate([
    (0, common_1.Controller)("oratio/rosary"),
    __metadata("design:paramtypes", [rosary_service_1.RosaryService])
], RosaryController);
//# sourceMappingURL=rosary.controller.js.map