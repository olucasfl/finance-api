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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let MailService = MailService_1 = class MailService {
    logger = new common_1.Logger(MailService_1.name);
    apiUrl = "https://api.brevo.com/v3/smtp/email";
    buildTemplate(title, message, buttonText, link, footer) {
        return `
<div style="
  background:#0f172a;
  padding:40px 20px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
">

  <div style="
    max-width:520px;
    margin:auto;
    background:#1e293b;
    border-radius:16px;
    padding:40px;
    text-align:center;
    border:1px solid rgba(255,255,255,0.08);
  ">

    <h1 style="
      margin:0;
      font-size:26px;
      color:white;
      letter-spacing:0.5px;
    ">
      Smart Finance
    </h1>

    <div style="
      height:3px;
      width:60px;
      margin:18px auto 28px auto;
      background:linear-gradient(90deg,#d4af37,#f5d06f);
      border-radius:4px;
    "></div>

    <h2 style="
      color:white;
      margin-bottom:12px;
      font-weight:600;
    ">
      ${title}
    </h2>

    <p style="
      color:#94a3b8;
      font-size:15px;
      line-height:1.6;
      margin-bottom:30px;
    ">
      ${message}
    </p>

    <a href="${link}"
    style="
      display:inline-block;
      padding:14px 28px;
      background:linear-gradient(90deg,#3b82f6,#2563eb);
      color:white;
      font-weight:600;
      border-radius:10px;
      text-decoration:none;
      font-size:15px;
      box-shadow:0 6px 20px rgba(37,99,235,0.35);
    ">
      ${buttonText}
    </a>

    <p style="
      color:#64748b;
      font-size:13px;
      margin-top:28px;
      line-height:1.5;
    ">
      ${footer}
    </p>

    <p style="
      margin-top:18px;
      font-size:12px;
      color:#64748b;
      word-break:break-all;
    ">
      Se o botão não funcionar, copie e cole este link:<br>
      <span style="color:#3b82f6">${link}</span>
    </p>

  </div>

  <p style="
    text-align:center;
    margin-top:20px;
    color:#64748b;
    font-size:12px;
  ">
    © ${new Date().getFullYear()} Smart Finance
  </p>

</div>
`;
    }
    buildOratioTemplate(title, message, buttonText, link, footer) {
        return `
<div style="
  background:#FBF6EE;
  padding:40px 20px;
  font-family:Georgia,serif;
">

  <div style="
    max-width:520px;
    margin:auto;
    background:white;
    border-radius:14px;
    padding:40px;
    text-align:center;
    border:1px solid rgba(0,0,0,0.08);
  ">

    <h1 style="
      margin:0;
      font-size:28px;
      color:#7B1113;
      letter-spacing:1px;
    ">
      ORATIO
    </h1>

    <div style="
      height:2px;
      width:60px;
      margin:18px auto 28px auto;
      background:#7B1113;
      border-radius:4px;
    "></div>

    <h2 style="
      color:#1e293b;
      margin-bottom:12px;
      font-weight:600;
    ">
      ${title}
    </h2>

    <p style="
      color:#475569;
      font-size:15px;
      line-height:1.6;
      margin-bottom:30px;
    ">
      ${message}
    </p>

    <a href="${link}"
    style="
      display:inline-block;
      padding:14px 26px;
      background:#7B1113;
      color:white;
      font-weight:600;
      border-radius:8px;
      text-decoration:none;
      font-size:15px;
    ">
      ${buttonText}
    </a>

    <p style="
      color:#64748b;
      font-size:13px;
      margin-top:28px;
      line-height:1.5;
    ">
      ${footer}
    </p>

    <p style="
      margin-top:18px;
      font-size:12px;
      color:#64748b;
      word-break:break-all;
    ">
      Se o botão não funcionar, copie este link:<br>
      <span style="color:#7B1113">${link}</span>
    </p>

  </div>

  <p style="
    text-align:center;
    margin-top:20px;
    color:#64748b;
    font-size:12px;
  ">
    © ${new Date().getFullYear()} Oratio
  </p>

</div>
`;
    }
    async sendEmail(email, subject, htmlContent, senderName) {
        if (!process.env.BREVO_API_KEY) {
            this.logger.error("BREVO_API_KEY is not defined");
            return;
        }
        try {
            await axios_1.default.post(this.apiUrl, {
                sender: {
                    name: senderName,
                    email: "lucasfariasleandro@gmail.com"
                },
                to: [{ email }],
                subject,
                htmlContent
            }, {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout: 10000
            });
            this.logger.log(`Email enviado para ${email}`);
        }
        catch (error) {
            this.logger.error("Erro ao enviar email");
            if (error.response) {
                this.logger.error(error.response.data);
            }
            else {
                this.logger.error(error.message);
            }
        }
    }
    async sendVerificationEmail(email, token) {
        const link = `https://finance-api-y0ol.onrender.com/auth/verify-email?token=${token}&app=smart-finance`;
        const htmlContent = this.buildTemplate("Confirme seu email", "Bem-vindo ao <b>Smart Finance</b>.<br>Clique no botão abaixo para confirmar seu email e ativar sua conta.", "Confirmar email", link, "Se você não criou uma conta, pode ignorar este email.");
        await this.sendEmail(email, "Smart Finance • Confirme seu email", htmlContent, "Smart Finance");
    }
    async sendPasswordResetEmail(email, token) {
        const link = `https://finance-api-front.vercel.app/login?resetToken=${token}&app=smart-finance`;
        const htmlContent = this.buildTemplate("Redefinir sua senha", "Recebemos uma solicitação para redefinir sua senha.", "Redefinir senha", link, "Este link expira em 30 minutos por segurança.");
        await this.sendEmail(email, "Smart Finance • Redefinir senha", htmlContent, "Smart Finance");
    }
    async sendOratioVerificationEmail(email, token) {
        const link = `https://finance-api-y0ol.onrender.com/auth/verify-email?token=${token}&app=oratio`;
        const htmlContent = this.buildOratioTemplate("Confirme seu email", "Bem-vindo ao <b>Oratio</b>.<br>Confirme seu email para começar sua caminhada espiritual.", "Confirmar email", link, "Se você não criou uma conta, ignore este email.");
        await this.sendEmail(email, "Oratio • Confirme seu email", htmlContent, "Oratio");
    }
    async sendOratioPasswordResetEmail(email, token) {
        const link = `https://oratio-phi.vercel.app/login?resetToken=${token}&app=oratio`;
        const htmlContent = this.buildOratioTemplate("Redefinir senha", "Recebemos um pedido para redefinir sua senha no <b>Oratio</b>.", "Criar nova senha", link, "Este link expira em 30 minutos.");
        await this.sendEmail(email, "Oratio • Redefinir senha", htmlContent, "Oratio");
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)()
], MailService);
//# sourceMappingURL=mail.service.js.map