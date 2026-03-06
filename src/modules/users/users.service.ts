import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /*
  =============================
  CREATE USER
  =============================
  */

  async create(data: CreateUserDto) {

    if (data.password !== data.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const emailExists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const token = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        emailVerificationToken: token,
      },
    });

    await this.mailService.sendVerificationEmail(user.email, token);

    const { password, refreshToken, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /*
  =============================
  GET USER PROFILE
  =============================
  */

  async getProfile(userId: string) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, refreshToken, ...safeUser } = user;

    return safeUser;
  }

  /*
  =============================
  UPDATE NAME
  =============================
  */

  async updateProfile(userId: string, name: string) {

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    const { password, refreshToken, ...safeUser } = user;

    return safeUser;
  }

  /*
  =============================
  DELETE ACCOUNT
  =============================
  */

  async deleteAccount(userId: string) {

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'Account deleted successfully',
    };
  }

}