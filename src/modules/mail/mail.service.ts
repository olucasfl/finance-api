import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class MailService {

  private readonly logger = new Logger(MailService.name);

  private readonly apiUrl = "https://api.brevo.com/v3/smtp/email";

  /*
  =============================
  SMART FINANCE TEMPLATE
  =============================
  */

  private buildTemplate(
    title: string,
    message: string,
    buttonText: string,
    link: string,
    footer: string
  ) {

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

  /*
  =============================
  ORATIO TEMPLATE
  =============================
  */

  private buildOratioTemplate(
    title: string,
    message: string,
    buttonText: string,
    link: string,
    footer: string
  ) {

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

  /*
  =============================
  SEND EMAIL GENERIC
  =============================
  */

  private async sendEmail(
    email: string,
    subject: string,
    htmlContent: string,
    senderName: string
  ) {

    if (!process.env.BREVO_API_KEY) {
      this.logger.error("BREVO_API_KEY is not defined");
      return;
    }

    try {

      await axios.post(
        this.apiUrl,
        {
          sender: {
            name: senderName,
            email: "lucasfariasleandro@gmail.com"
          },
          to: [{ email }],
          subject,
          htmlContent
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json"
          },
          timeout: 10000
        }
      );

      this.logger.log(`Email enviado para ${email}`);

    } catch (error: any) {

      this.logger.error("Erro ao enviar email");

      if (error.response) {
        this.logger.error(error.response.data);
      } else {
        this.logger.error(error.message);
      }

    }

  }

  /*
  =============================
  SMART FINANCE EMAILS
  =============================
  */

  async sendVerificationEmail(email: string, token: string) {

    const link = `https://finance-api-y0ol.onrender.com/auth/verify-email?token=${token}&app=smart-finance`;

    const htmlContent = this.buildTemplate(
      "Confirme seu email",
      "Bem-vindo ao <b>Smart Finance</b>.<br>Clique no botão abaixo para confirmar seu email e ativar sua conta.",
      "Confirmar email",
      link,
      "Se você não criou uma conta, pode ignorar este email."
    );

    await this.sendEmail(
      email,
      "Smart Finance • Confirme seu email",
      htmlContent,
      "Smart Finance"
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {

    const link = `https://finance-api-front.vercel.app/login?resetToken=${token}&app=smart-finance`;

    const htmlContent = this.buildTemplate(
      "Redefinir sua senha",
      "Recebemos uma solicitação para redefinir sua senha.",
      "Redefinir senha",
      link,
      "Este link expira em 30 minutos por segurança."
    );

    await this.sendEmail(
      email,
      "Smart Finance • Redefinir senha",
      htmlContent,
      "Smart Finance"
    );
  }

  /*
  =============================
  CRAVOU TEMPLATE
  =============================
  */

  private buildCravouTemplate(
    title: string,
    message: string,
    buttonText: string,
    link: string,
    footer: string
  ) {

    return `
<div style="
  background:#0d0d0d;
  padding:40px 20px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
">

  <div style="
    max-width:520px;
    margin:auto;
    background:#1a1a1a;
    border-radius:16px;
    padding:40px;
    text-align:center;
    border:1px solid rgba(255,255,255,0.08);
  ">

    <h1 style="
      margin:0;
      font-size:30px;
      font-weight:800;
      color:white;
      letter-spacing:1px;
    ">
      Cravou<span style="color:#e11d48">!</span>
    </h1>

    <div style="
      height:3px;
      width:60px;
      margin:18px auto 28px auto;
      background:#e11d48;
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
      color:#a1a1aa;
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
      background:#e11d48;
      color:white;
      font-weight:700;
      border-radius:10px;
      text-decoration:none;
      font-size:15px;
      box-shadow:0 6px 20px rgba(225,29,72,0.35);
    ">
      ${buttonText}
    </a>

    <p style="
      color:#71717a;
      font-size:13px;
      margin-top:28px;
      line-height:1.5;
    ">
      ${footer}
    </p>

    <p style="
      margin-top:18px;
      font-size:12px;
      color:#71717a;
      word-break:break-all;
    ">
      Se o botão não funcionar, copie e cole este link:<br>
      <span style="color:#e11d48">${link}</span>
    </p>

  </div>

  <p style="
    text-align:center;
    margin-top:20px;
    color:#71717a;
    font-size:12px;
  ">
    © ${new Date().getFullYear()} Cravou!
  </p>

</div>
`;
  }

  /*
  =============================
  ORATIO EMAILS
  =============================
  */

  async sendOratioVerificationEmail(email: string, token: string) {

    const link = `https://finance-api-y0ol.onrender.com/auth/verify-email?token=${token}&app=oratio`;

    const htmlContent = this.buildOratioTemplate(
      "Confirme seu email",
      "Bem-vindo ao <b>Oratio</b>.<br>Confirme seu email para começar sua caminhada espiritual.",
      "Confirmar email",
      link,
      "Se você não criou uma conta, ignore este email."
    );

    await this.sendEmail(
      email,
      "Oratio • Confirme seu email",
      htmlContent,
      "Oratio"
    );
  }

  async sendOratioPasswordResetEmail(email: string, token: string) {

    const link = `https://oratio-phi.vercel.app/login?resetToken=${token}&app=oratio`;

    const htmlContent = this.buildOratioTemplate(
      "Redefinir senha",
      "Recebemos um pedido para redefinir sua senha no <b>Oratio</b>.",
      "Criar nova senha",
      link,
      "Este link expira em 30 minutos."
    );

    await this.sendEmail(
      email,
      "Oratio • Redefinir senha",
      htmlContent,
      "Oratio"
    );
  }

  /*
  =============================
  CRAVOU EMAILS
  =============================
  */

  async sendCravouVerificationEmail(email: string, token: string) {

    const link = `https://finance-api-y0ol.onrender.com/auth/verify-email?token=${token}&app=cravou`;

    const htmlContent = this.buildCravouTemplate(
      "Confirme seu email",
      "Bem-vindo ao <b>Cravou!</b><br>Clique no botão abaixo para confirmar seu email e ativar sua conta.",
      "Confirmar email",
      link,
      "Se você não criou uma conta, pode ignorar este email."
    );

    await this.sendEmail(
      email,
      "Cravou! • Confirme seu email",
      htmlContent,
      "Cravou!"
    );
  }

  async sendCravouPasswordResetEmail(email: string, token: string) {

    const link = `https://cravou-ashy.vercel.app/reset-password?token=${token}`;

    const htmlContent = this.buildCravouTemplate(
      "Redefinir senha",
      "Recebemos uma solicitação para redefinir sua senha no <b>Cravou!</b>.",
      "Redefinir senha",
      link,
      "Este link expira em 30 minutos por segurança."
    );

    await this.sendEmail(
      email,
      "Cravou! • Redefinir senha",
      htmlContent,
      "Cravou!"
    );
  }

}