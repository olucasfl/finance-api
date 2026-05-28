"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiturgiaService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const missa_builder_1 = require("./builders/missa.builder");
let LiturgiaService = class LiturgiaService {
    async getToday() {
        const res = await axios_1.default.get("https://liturgia.up.railway.app/v2/");
        return res.data;
    }
    async getByDate(dia, mes, ano) {
        const res = await axios_1.default.get(`https://liturgia.up.railway.app/v2/?dia=${dia}&mes=${mes}&ano=${ano}`);
        return res.data;
    }
    async getFull(dia, mes, ano) {
        const data = await this.getByDate(dia, mes, ano);
        return (0, missa_builder_1.buildMissa)(data);
    }
};
exports.LiturgiaService = LiturgiaService;
exports.LiturgiaService = LiturgiaService = __decorate([
    (0, common_1.Injectable)()
], LiturgiaService);
//# sourceMappingURL=liturgia.service.js.map