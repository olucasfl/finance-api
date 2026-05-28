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
exports.JourneyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const journey_service_1 = require("./journey.service");
const create_journey_dto_1 = require("./dto/create-journey.dto");
const create_intent_dto_1 = require("./dto/create-intent.dto");
let JourneyController = class JourneyController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(req, dto) {
        return this.service.createJourney(req.user.userId, dto.partnerEmail);
    }
    getJourney(req) {
        return this.service.getJourney(req.user.userId);
    }
    getHistory(req) {
        return this.service.getHistory(req.user.userId);
    }
    deleteJourney(req) {
        return this.service.deleteJourney(req.user.userId);
    }
    createIntent(req, dto) {
        return this.service.createIntent(req.user.userId, dto.text);
    }
    deleteIntent(req, id) {
        return this.service.deleteIntent(req.user.userId, id);
    }
};
exports.JourneyController = JourneyController;
__decorate([
    (0, common_1.Post)("create"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_journey_dto_1.CreateJourneyDto]),
    __metadata("design:returntype", void 0)
], JourneyController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JourneyController.prototype, "getJourney", null);
__decorate([
    (0, common_1.Get)("history"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JourneyController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JourneyController.prototype, "deleteJourney", null);
__decorate([
    (0, common_1.Post)("intent"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_intent_dto_1.CreateIntentDto]),
    __metadata("design:returntype", void 0)
], JourneyController.prototype, "createIntent", null);
__decorate([
    (0, common_1.Delete)("intent/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], JourneyController.prototype, "deleteIntent", null);
exports.JourneyController = JourneyController = __decorate([
    (0, common_1.Controller)("oratio/journey"),
    __metadata("design:paramtypes", [journey_service_1.JourneyService])
], JourneyController);
//# sourceMappingURL=journey.controller.js.map