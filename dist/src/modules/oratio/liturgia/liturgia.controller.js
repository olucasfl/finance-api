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
exports.LiturgiaController = void 0;
const common_1 = require("@nestjs/common");
const liturgia_service_1 = require("./liturgia.service");
let LiturgiaController = class LiturgiaController {
    liturgiaService;
    constructor(liturgiaService) {
        this.liturgiaService = liturgiaService;
    }
    getToday() {
        return this.liturgiaService.getToday();
    }
    getFull(dia, mes, ano) {
        return this.liturgiaService.getFull(dia, mes, ano);
    }
};
exports.LiturgiaController = LiturgiaController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiturgiaController.prototype, "getToday", null);
__decorate([
    (0, common_1.Get)("/full"),
    __param(0, (0, common_1.Query)("dia")),
    __param(1, (0, common_1.Query)("mes")),
    __param(2, (0, common_1.Query)("ano")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], LiturgiaController.prototype, "getFull", null);
exports.LiturgiaController = LiturgiaController = __decorate([
    (0, common_1.Controller)("liturgia"),
    __metadata("design:paramtypes", [liturgia_service_1.LiturgiaService])
], LiturgiaController);
//# sourceMappingURL=liturgia.controller.js.map