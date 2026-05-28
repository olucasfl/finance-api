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
exports.VoxAiController = void 0;
const common_1 = require("@nestjs/common");
const voxai_service_1 = require("./voxai.service");
const voxai_dto_1 = require("./dto/voxai.dto");
const prisma_service_1 = require("../../../prisma/prisma.service");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
let VoxAiController = class VoxAiController {
    voxAiService;
    prisma;
    constructor(voxAiService, prisma) {
        this.voxAiService = voxAiService;
        this.prisma = prisma;
    }
    async chat(body) {
        return this.voxAiService.chat(body);
    }
    async getActiveConversation(req) {
        const userId = req.user.userId;
        return this.voxAiService.getOrCreateActiveConversation(userId);
    }
    async createConversation(req) {
        const userId = req.user.userId;
        return this.voxAiService.getOrCreateActiveConversation(userId);
    }
    async getConversations(req) {
        const userId = req.user.userId;
        return this.prisma.conversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" }
        });
    }
    async getMessages(id, req) {
        const userId = req.user.userId;
        const conversation = await this.prisma.conversation.findUnique({
            where: { id }
        });
        if (!conversation || conversation.userId !== userId) {
            return { error: "Acesso negado" };
        }
        return this.prisma.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: "asc" }
        });
    }
    async deleteConversation(id, req) {
        const userId = req.user.userId;
        return this.voxAiService.deleteConversation(userId, id);
    }
    async renameConversation(id, title, req) {
        const userId = req.user.userId;
        return this.voxAiService.renameConversation(userId, id, title);
    }
};
exports.VoxAiController = VoxAiController;
__decorate([
    (0, common_1.Post)("chat"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [voxai_dto_1.VoxAiDto]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)("conversation/active"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "getActiveConversation", null);
__decorate([
    (0, common_1.Post)("conversation"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)("conversations"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)("conversation/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Delete)("conversation/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "deleteConversation", null);
__decorate([
    (0, common_1.Patch)("conversation/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("title")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VoxAiController.prototype, "renameConversation", null);
exports.VoxAiController = VoxAiController = __decorate([
    (0, common_1.Controller)("oratio/voxai"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [voxai_service_1.VoxAiService,
        prisma_service_1.PrismaService])
], VoxAiController);
//# sourceMappingURL=voxai.controller.js.map