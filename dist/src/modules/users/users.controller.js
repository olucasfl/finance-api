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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let UsersController = class UsersController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    create(body, app) {
        return this.userService.create(body, app);
    }
    getProfile(req) {
        const userId = req?.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.getProfile(userId);
    }
    getAllUsers(req, search, isAdmin, emailVerified, activeLastDays) {
        const userId = req?.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        const filters = {
            search: search || undefined,
            isAdmin: isAdmin === 'true' ? true : isAdmin === 'false' ? false : undefined,
            emailVerified: emailVerified === 'true' ? true : emailVerified === 'false' ? false : undefined,
            activeLastDays: activeLastDays ? parseInt(activeLastDays) : undefined,
        };
        return this.userService.getAllUsers(userId, filters);
    }
    getUserDetail(req, userId) {
        const adminId = req?.user?.userId;
        if (!adminId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.getUserDetail(adminId, userId);
    }
    deleteUser(req, userId) {
        const adminId = req?.user?.userId;
        if (!adminId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.deleteUserAdmin(adminId, userId);
    }
    getAdminStats(req) {
        const userId = req?.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.getAdminStats(userId);
    }
    setAdminStatus(req, id, body) {
        const userId = req?.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.setAdminStatus(userId, id, body.isAdmin, body.adminPassword);
    }
    getUserActivity(req, userId) {
        const adminId = req?.user?.userId;
        if (!adminId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.getUserActivity(adminId, userId);
    }
    updateProfile(req, body) {
        const userId = req?.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.updateProfile(userId, body.name);
    }
    deleteAccount(req) {
        const userId = req?.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        return this.userService.deleteAccount(userId);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-app')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('admin/users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('isAdmin')),
    __param(3, (0, common_1.Query)('emailVerified')),
    __param(4, (0, common_1.Query)('activeLastDays')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('admin/users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getUserDetail", null);
__decorate([
    (0, common_1.Delete)('admin/users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('admin/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAdminStats", null);
__decorate([
    (0, common_1.Patch)('admin/users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "setAdminStatus", null);
__decorate([
    (0, common_1.Get)('admin/users/:id/activity'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getUserActivity", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deleteAccount", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map