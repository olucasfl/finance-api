import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };

  const ORIGINAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN_PASSWORD;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setAdminStatus', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'correct-admin-secret';
      // assertAdmin's lookup on the caller
      prisma.user.findUnique.mockResolvedValue({ isAdmin: true });
    });

    it('accepts the correct ADMIN_PASSWORD', async () => {
      prisma.user.update.mockResolvedValue({ id: 'target-1', isAdmin: true });

      await expect(
        service.setAdminStatus('admin-1', 'target-1', true, 'correct-admin-secret'),
      ).resolves.toEqual({ id: 'target-1', isAdmin: true });
    });

    it('rejects a wrong ADMIN_PASSWORD instead of throwing on length mismatch', async () => {
      await expect(
        service.setAdminStatus('admin-1', 'target-1', true, 'nope'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an empty ADMIN_PASSWORD candidate', async () => {
      await expect(
        service.setAdminStatus('admin-1', 'target-1', true, ''),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects even an empty candidate when ADMIN_PASSWORD itself is unset', async () => {
      delete process.env.ADMIN_PASSWORD;

      await expect(
        service.setAdminStatus('admin-1', 'target-1', true, ''),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deleteAccount', () => {
    it('deletes the account when the current password matches', async () => {
      const hashed = await bcrypt.hash('CorrectPass123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: hashed });
      prisma.user.delete.mockResolvedValue({});

      await expect(
        service.deleteAccount('user-1', 'CorrectPass123'),
      ).resolves.toEqual({ message: 'Account deleted successfully' });

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('refuses to delete when the password is wrong, and never calls delete', async () => {
      const hashed = await bcrypt.hash('CorrectPass123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: hashed });

      await expect(
        service.deleteAccount('user-1', 'WrongPass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
