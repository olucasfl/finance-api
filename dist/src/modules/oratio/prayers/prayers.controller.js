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
exports.PrayersController = void 0;
const common_1 = require("@nestjs/common");
const prayers_service_1 = require("./prayers.service");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
let PrayersController = class PrayersController {
    service;
    constructor(service) {
        this.service = service;
    }
    createCategory(body) {
        return this.service.createCategory(body);
    }
    getCategories() {
        return this.service.getCategories();
    }
    createPrayer(body) {
        return this.service.createPrayer(body);
    }
    getPrayers(slug) {
        if (!slug) {
            throw new common_1.BadRequestException("Category slug is required");
        }
        return this.service.getPrayersByCategory(slug);
    }
    getPrayer(id) {
        return this.service.getPrayer(id);
    }
    completePrayer(req) {
        return this.service.completePrayer(req.user.userId);
    }
};
exports.PrayersController = PrayersController;
__decorate([
    (0, common_1.Post)("category"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrayersController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)("categories"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrayersController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrayersController.prototype, "createPrayer", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("category")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrayersController.prototype, "getPrayers", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrayersController.prototype, "getPrayer", null);
__decorate([
    (0, common_1.Post)("complete"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrayersController.prototype, "completePrayer", null);
exports.PrayersController = PrayersController = __decorate([
    (0, common_1.Controller)('oratio/prayers'),
    __metadata("design:paramtypes", [prayers_service_1.PrayersService])
], PrayersController);
//# sourceMappingURL=prayers.controller.js.map