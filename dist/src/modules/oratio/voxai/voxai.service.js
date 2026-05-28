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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoxAiService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../../prisma/prisma.service");
const vox_prompt_1 = require("./prompts/vox.prompt");
const buildPrompt_1 = require("./utils/buildPrompt");
const vox_content_filter_1 = require("./filters/vox.content-filter");
const vox_rate_limiter_1 = require("./guards/vox.rate-limiter");
const liturgical_calendar_service_1 = require("./services/liturgical-calendar.service");
const date_parser_1 = require("./utils/date-parser");
const activity_service_1 = require("../activity/activity.service");
let VoxAiService = class VoxAiService {
    rateLimiter;
    prisma;
    liturgicalCalendarService;
    activityService;
    constructor(rateLimiter, prisma, liturgicalCalendarService, activityService) {
        this.rateLimiter = rateLimiter;
        this.prisma = prisma;
        this.liturgicalCalendarService = liturgicalCalendarService;
        this.activityService = activityService;
    }
    apiKey = process.env.GEMINI_API_KEY;
    url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";
    generateTitle(text) {
        return text
            .replace(/[^\w\s]/gi, "")
            .split(" ")
            .slice(0, 5)
            .join(" ");
    }
    formatLiturgicalForAI(data) {
        if (!data)
            return "NÃO DISPONÍVEL";
        const evangelho = data?.leituras?.evangelho?.[0];
        const primeira = data?.leituras?.primeiraLeitura?.[0];
        const segunda = data?.leituras?.segundaLeitura?.[0];
        const salmo = data?.leituras?.salmo?.[0];
        return `
📅 Data: ${data.data}
📖 Liturgia: ${data.liturgia}
🎨 Cor: ${data.cor}

📜 Primeira Leitura: ${primeira?.referencia}
${primeira?.texto?.slice(0, 300)}

📜 Salmo: ${salmo?.referencia}
Refrao: ${salmo?.refrao}
${salmo?.texto?.slice(0, 600)}

📜 Segunda Leitura: ${segunda?.referencia || "—"}
${segunda?.texto?.slice(0, 300) || ""}

📜 Evangelho: ${evangelho?.referencia}
${evangelho?.texto?.slice(0, 800)}
`;
    }
    async extractDateWithAI(message) {
        try {
            const response = await axios_1.default.post(`${this.url}?key=${this.apiKey}`, {
                contents: [
                    {
                        parts: [
                            {
                                text: `
Extraia a data da frase abaixo.

Regras MUITO IMPORTANTES:
- Responda SOMENTE no formato YYYY-MM-DD (ex: 2026-03-22)
- NÃO escreva texto
- NÃO explique
- NÃO use outro formato

Se não houver data clara, responda: NONE

Frase: "${message}"
`
                            }
                        ]
                    }
                ]
            });
            const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!text || text === "NONE")
                return null;
            const normalized = text.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
                return new Date(normalized + "T00:00:00");
            }
            const parsed = new Date(normalized);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async getOrCreateActiveConversation(userId) {
        const existing = await this.prisma.conversation.findFirst({
            where: {
                userId,
                hasMessages: false
            },
            orderBy: { createdAt: "desc" }
        });
        if (existing)
            return existing;
        return this.prisma.conversation.create({
            data: {
                userId,
                title: "Nova conversa",
                hasMessages: false
            }
        });
    }
    async chat(data) {
        try {
            if (!this.apiKey) {
                throw new Error("GEMINI_API_KEY not configured");
            }
            if (!data.message) {
                return {
                    success: false,
                    error: "EMPTY_MESSAGE",
                    message: "Mensagem vazia."
                };
            }
            if (data.message.length > 1000) {
                return {
                    success: false,
                    error: "MESSAGE_TOO_LONG",
                    message: "Mensagem muito longa."
                };
            }
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: data.conversationId }
            });
            if (!conversation) {
                return {
                    success: false,
                    error: "INVALID_CONVERSATION",
                    message: "Conversa inválida."
                };
            }
            const rate = this.rateLimiter.check("global-user");
            if (!rate.allowed) {
                return {
                    success: false,
                    error: "RATE_LIMIT",
                    message: rate.message
                };
            }
            const filter = (0, vox_content_filter_1.contentFilter)(data.message);
            if (filter.blocked) {
                return {
                    success: true,
                    response: filter.message
                };
            }
            const historyMessages = await this.prisma.message.findMany({
                where: { conversationId: data.conversationId },
                orderBy: { createdAt: "desc" },
                take: 6
            });
            const history = historyMessages
                .reverse()
                .map(m => ({
                role: m.role,
                content: m.content
            }));
            const existing = await this.prisma.message.findFirst({
                where: {
                    conversationId: data.conversationId,
                    role: "user",
                    content: data.message,
                    createdAt: {
                        gte: new Date(Date.now() - 5000)
                    }
                },
                orderBy: { createdAt: "desc" }
            });
            if (existing) {
                return {
                    success: true,
                    response: "Aguarde, processando sua última mensagem..."
                };
            }
            const now = new Date();
            const brazilToday = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
            let parsedDate = await this.extractDateWithAI(data.message);
            if (!parsedDate) {
                parsedDate = (0, date_parser_1.parseNaturalDate)(data.message);
            }
            if (!parsedDate) {
                parsedDate = now;
            }
            const requestedDateText = parsedDate.toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo"
            });
            let targetLiturgical = null;
            try {
                targetLiturgical = await this.liturgicalCalendarService.getLiturgicalData(parsedDate);
            }
            catch {
                targetLiturgical = null;
            }
            const liturgicalContext = await this.liturgicalCalendarService.getLiturgicalContext(parsedDate);
            const liturgySummarized = this.formatLiturgicalForAI(targetLiturgical);
            const enhancedSystemPrompt = `${vox_prompt_1.VOX_SYSTEM_PROMPT}

⚠️ REGRA ABSOLUTA:
Se a seção "Liturgia EXATA" estiver presente, você DEVE usar essas informações.
É PROIBIDO dizer que não tem dados se eles estiverem disponíveis.

Data atual (Brasil): ${brazilToday}
Data solicitada: ${requestedDateText}

Liturgia EXATA:
${liturgySummarized}
`;
            const prompt = (0, buildPrompt_1.buildPrompt)(enhancedSystemPrompt, history, data.message);
            const response = await axios_1.default.post(`${this.url}?key=${this.apiKey}`, {
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }, {
                timeout: 30000
            });
            const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error("EMPTY_AI_RESPONSE");
            }
            const isFirstMessage = !conversation.hasMessages;
            await this.prisma.$transaction([
                this.prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        role: "user",
                        content: data.message
                    }
                }),
                this.prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        role: "assistant",
                        content: text
                    }
                }),
                this.prisma.conversation.update({
                    where: { id: data.conversationId },
                    data: {
                        updatedAt: new Date(),
                        hasMessages: true,
                        ...(isFirstMessage && {
                            title: this.generateTitle(data.message)
                        })
                    }
                })
            ]);
            await this.activityService.log(conversation.userId, "VOX", "Conversou com o Vox");
            return {
                success: true,
                response: text
            };
        }
        catch (error) {
            console.error("Erro VoxAI:", {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error.message
            });
            if (error?.response?.status === 401) {
                return {
                    success: false,
                    error: "UNAUTHORIZED",
                    message: "Sessão expirada."
                };
            }
            if (error?.response?.status === 429) {
                return {
                    success: false,
                    error: "LIMIT_EXCEEDED",
                    message: "O VoxAI atingiu o limite diário."
                };
            }
            if (error.code === "ECONNABORTED") {
                return {
                    success: false,
                    error: "TIMEOUT",
                    message: "O Vox demorou para responder."
                };
            }
            if (error?.response) {
                return {
                    success: false,
                    error: "AI_PROVIDER_ERROR",
                    message: "Erro na comunicação com a IA."
                };
            }
            return {
                success: false,
                error: "UNKNOWN_ERROR",
                message: "Erro inesperado no servidor."
            };
        }
    }
    async deleteConversation(userId, conversationId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId }
        });
        if (!conversation || conversation.userId !== userId) {
            throw new Error("CONVERSATION_NOT_FOUND");
        }
        await this.prisma.message.deleteMany({
            where: { conversationId }
        });
        await this.prisma.conversation.delete({
            where: { id: conversationId }
        });
        return this.getOrCreateActiveConversation(userId);
    }
    async renameConversation(userId, conversationId, title) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId }
        });
        if (!conversation || conversation.userId !== userId) {
            throw new Error("CONVERSATION_NOT_FOUND");
        }
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: { title }
        });
    }
};
exports.VoxAiService = VoxAiService;
exports.VoxAiService = VoxAiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [vox_rate_limiter_1.VoxRateLimiter,
        prisma_service_1.PrismaService,
        liturgical_calendar_service_1.LiturgicalCalendarService,
        activity_service_1.ActivityService])
], VoxAiService);
//# sourceMappingURL=voxai.service.js.map