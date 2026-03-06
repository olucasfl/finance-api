import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class MailService {

  private readonly logger = new Logger(MailService.name);

  private readonly apiUrl = "https://api.brevo.com/v3/smtp/email";

  async sendVerificationEmail(email: string, token: string) {

    if (!process.env.BREVO_API_KEY) {
      this.logger.error("BREVO_API_KEY is not defined");
      return;
    }

    const link = `https://finance-api-front.vercel.app/?token=${token}`;

    const htmlContent = `
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
      Verify your email
    </h2>

    <p style="
      color:#94a3b8;
      font-size:15px;
      line-height:1.6;
      margin-bottom:30px;
    ">
      Welcome to <b>Smart Finance</b>.<br>
      Click the button below to confirm your email address and activate your account.
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
      Verify Email
    </a>

    <p style="
      color:#64748b;
      font-size:13px;
      margin-top:28px;
      line-height:1.5;
    ">
      If you did not create an account, you can safely ignore this email.
    </p>

    <p style="
      margin-top:18px;
      font-size:12px;
      color:#64748b;
      word-break:break-all;
    ">
      If the button doesn't work, copy and paste this link into your browser:<br>
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

    try {

      await axios.post(
        this.apiUrl,
        {
          sender: {
            name: "Smart Finance",
            email: "lucasfariasleandro@gmail.com"
          },
          to: [{ email }],
          subject: "Smart Finance • Verify your email",
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

      this.logger.log(`Verification email sent to ${email}`);

    } catch (error: any) {

      this.logger.error("Error sending verification email");

      if (error.response) {
        this.logger.error(error.response.data);
      } else {
        this.logger.error(error.message);
      }

    }

  }

}