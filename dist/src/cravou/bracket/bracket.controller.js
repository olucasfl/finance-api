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
exports.BracketController = void 0;
const common_1 = require("@nestjs/common");
const bracket_service_1 = require("./bracket.service");
let BracketController = class BracketController {
    bracketService;
    constructor(bracketService) {
        this.bracketService = bracketService;
    }
    getBracket() {
        return this.bracketService.getBracket();
    }
    getRoundOf32() {
        return this.bracketService.getBracketByRound('round_of_32');
    }
    getRoundOf16() {
        return this.bracketService.getBracketByRound('round_of_16');
    }
    getQuarterfinals() {
        return this.bracketService.getBracketByRound('quarterfinal');
    }
    getSemifinals() {
        return this.bracketService.getBracketByRound('semifinal');
    }
    getFinal() {
        return this.bracketService.getBracketByRound('final');
    }
    getByRound(round) {
        return this.bracketService.getBracketByRound(round);
    }
};
exports.BracketController = BracketController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getBracket", null);
__decorate([
    (0, common_1.Get)('round-of-32'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getRoundOf32", null);
__decorate([
    (0, common_1.Get)('round-of-16'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getRoundOf16", null);
__decorate([
    (0, common_1.Get)('quarterfinals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getQuarterfinals", null);
__decorate([
    (0, common_1.Get)('semifinals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getSemifinals", null);
__decorate([
    (0, common_1.Get)('final'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getFinal", null);
__decorate([
    (0, common_1.Get)(':round'),
    __param(0, (0, common_1.Param)('round')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BracketController.prototype, "getByRound", null);
exports.BracketController = BracketController = __decorate([
    (0, common_1.Controller)('cravou/bracket'),
    __metadata("design:paramtypes", [bracket_service_1.BracketService])
], BracketController);
//# sourceMappingURL=bracket.controller.js.map