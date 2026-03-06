import { Injectable } from "@nestjs/common";
import { Resend } from "resend";

@Injectable()
export class MailService {

  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendVerificationEmail(email: string, token: string) {

    const link = `https://finance-api-front.vercel.app/verify-email?token=${token}`;

    await this.resend.emails.send({
      from: "Smart Finance <onboarding@resend.dev>",
      to: email,
      subject: "Confirm your email",
      html: `
        <h2>Confirm your email</h2>
        <p>Click the button below to verify your email.</p>

        <a href="${link}"
        style="
        display:inline-block;
        padding:12px 24px;
        background:#2563eb;
        color:white;
        border-radius:8px;
        text-decoration:none;
        ">
        Verify Email
        </a>
      `
    });

  }
}