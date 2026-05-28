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
exports.LiturgicalCalendarService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let LiturgicalCalendarService = class LiturgicalCalendarService {
    cache = new Map();
    CACHE_EXPIRY = 24 * 60 * 60 * 1000;
    API_URL = "https://liturgia.up.railway.app/v2/";
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    async getLiturgicalData(date = new Date()) {
        const dateStr = this.formatDate(date);
        const cached = this.cache.get(dateStr);
        if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
            return cached.data;
        }
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const response = await axios_1.default.get(`${this.API_URL}?dia=${day}&mes=${month}&ano=${year}`, {
            validateStatus: (status) => status < 500,
        });
        if (response.status === 404) {
            return null;
        }
        const data = response.data;
        this.cache.set(dateStr, {
            date: dateStr,
            data,
            timestamp: Date.now(),
        });
        return data;
    }
    formatLiturgicalInfo(data) {
        if (!data)
            return "";
        let info = "";
        if (data.festas?.principal) {
            const festa = data.festas.principal;
            info += `🎎 **Festa**: ${festa.nome} (${festa.cor})\n`;
            info += `   Classe: ${festa.classe}, Grau: ${festa.grau}\n`;
        }
        if (data.leitoras) {
            info += `\n📖 **Leituras Litúrgicas**:\n`;
            if (data.leitoras.primeira) {
                info += `   **1ª Leitura**: ${data.leitoras.primeira.referencia}\n`;
                info += `   ${data.leitoras.primeira.texto?.substring(0, 150)}...\n`;
            }
            if (data.leitoras.segunda) {
                info += `\n   **2ª Leitura**: ${data.leitoras.segunda.referencia}\n`;
                info += `   ${data.leitoras.segunda.texto?.substring(0, 150)}...\n`;
            }
            if (data.leitoras.evangelio) {
                info += `\n   **Evangelho**: ${data.leitoras.evangelio.referencia}\n`;
                info += `   ${data.leitoras.evangelio.texto?.substring(0, 150)}...\n`;
            }
        }
        return info;
    }
    async getLiturgicalContext(requestedDate) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let context = "## 📅 CONTEXTO LITÚRGICO ATUAL\n\n";
        const yesterdayData = await this.getLiturgicalData(yesterday);
        if (yesterdayData) {
            context += `### 📆 Ontem (${this.formatDate(yesterday)})\n`;
            context += this.formatLiturgicalInfo(yesterdayData);
        }
        const todayData = await this.getLiturgicalData(today);
        if (todayData) {
            context += `\n### 📆 Hoje (${this.formatDate(today)})\n`;
            context += this.formatLiturgicalInfo(todayData);
        }
        const tomorrowData = await this.getLiturgicalData(tomorrow);
        if (tomorrowData) {
            context += `\n### 📆 Amanhã (${this.formatDate(tomorrow)})\n`;
            context += this.formatLiturgicalInfo(tomorrowData);
        }
        if (requestedDate) {
            const requestedData = await this.getLiturgicalData(requestedDate);
            context += `\n### 📆 Data solicitada (${this.formatDate(requestedDate)})\n`;
            context += requestedData ? this.formatLiturgicalInfo(requestedData) : "Dados litúrgicos não disponíveis para esta data.\n";
        }
        return context;
    }
    async getDayInfo(offsetDays = 0) {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        const dateStr = this.formatDate(date);
        const data = await this.getLiturgicalData(date);
        const info = data ? this.formatLiturgicalInfo(data) : "Dados não disponíveis";
        return { date: dateStr, info };
    }
};
exports.LiturgicalCalendarService = LiturgicalCalendarService;
exports.LiturgicalCalendarService = LiturgicalCalendarService = __decorate([
    (0, common_1.Injectable)()
], LiturgicalCalendarService);
//# sourceMappingURL=liturgical-calendar.service.js.map