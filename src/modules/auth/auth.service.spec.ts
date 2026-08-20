import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    refreshSession: { deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      refreshSession: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resetPassword', () => {
    it('revokes every existing refresh session so a leaked refresh token stops working after reset', async () => {
      const user = {
        id: 'user-1',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 60_000),
      };

      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, password: 'hashed' });

      await service.resetPassword('valid-token', 'NewPass123');

      expect(prisma.refreshSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
    });

    it('rejects an invalid or expired token without touching any session', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'NewPass123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.refreshSession.deleteMany).not.toHaveBeenCalled();
    });
  });
});
