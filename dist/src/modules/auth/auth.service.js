"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const mail_service_1 = require("../mail/mail.service");
const app_type_enum_1 = require("../../enums/app-type.enum");
let AuthService = class AuthService {
    prisma;
    jwtService;
    mailService;
    constructor(prisma, jwtService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async login(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email before logging in');
        }
        return this.generateTokens(user.id, user.email);
    }
    async generateTokens(userId, email) {
        const payload = { sub: userId, email };
        const access_token = this.jwtService.sign(payload, {
            expiresIn: '15m',
        });
        const refresh_token = this.jwtService.sign(payload, {
            expiresIn: '30d',
        });
        const hashedRefresh = await bcrypt.hash(refresh_token, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: hashedRefresh },
        });
        return {
            access_token,
            refresh_token,
        };
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException("Invalid or expired refresh token");
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user || !user.refreshToken) {
            throw new common_1.UnauthorizedException();
        }
        const matches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!matches) {
            throw new common_1.UnauthorizedException();
        }
        return this.generateTokens(user.id, user.email);
    }
    async verifyEmail(token, app, res) {
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerificationToken: token,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException("Invalid verification token");
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
            },
        });
        let redirectUrl = "https://finance-api-front.vercel.app/login";
        if (app === "oratio") {
            redirectUrl = "https://oratio-phi.vercel.app/login";
        }
        if (app === "smart-finance") {
            redirectUrl = "https://finance-api-front.vercel.app/login";
        }
        return res.redirect(redirectUrl);
    }
    async resendVerification(email, app) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'If this email exists, a verification email was sent.' };
        }
        if (user.emailVerified) {
            return { message: 'Email already verified.' };
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken: token,
            },
        });
        if (app === app_type_enum_1.AppType.ORATIO) {
            await this.mailService.sendOratioVerificationEmail(user.email, token);
        }
        else {
            await this.mailService.sendVerificationEmail(user.email, token);
        }
        return {
            message: 'Verification email resent successfully',
        };
    }
    async checkVerification(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        return {
            verified: user?.emailVerified || false
        };
    }
    async requestPasswordReset(email, app) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user)
            return;
        const token = (0, crypto_1.randomBytes)(32).toString("hex");
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: token,
                passwordResetExpires: expires
            }
        });
        if (app === app_type_enum_1.AppType.ORATIO) {
            await this.mailService.sendOratioPasswordResetEmail(user.email, token);
        }
        else {
            await this.mailService.sendPasswordResetEmail(user.email, token);
        }
    }
    async resetPassword(token, password) {
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: {
                    gt: new Date()
                }
            }
        });
        if (!user) {
            throw new common_1.UnauthorizedException("Invalid or expired token");
        }
        const hashed = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashed,
                passwordResetToken: null,
                passwordResetExpires: null
            }
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map