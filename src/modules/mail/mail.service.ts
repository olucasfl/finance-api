import { Injectable } from '@nestjs/common';
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {

  private transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  async sendVerificationEmail(email: string, token: string) {

    const link = `https://finance-api-front.vercel.app/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: `"Smart Finance" <${process.env.EMAIL_USER}>`,
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