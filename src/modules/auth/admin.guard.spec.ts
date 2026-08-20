import { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { PrismaService } from 'src/prisma/prisma.service';

function buildContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    guard = new AdminGuard(prisma as unknown as PrismaService);
  });

  it('denies access when there is no authenticated user on the request', async () => {
    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('grants access when the DB confirms isAdmin is true, looked up fresh (not from the JWT payload)', async () => {
    prisma.user.findUnique.mockResolvedValue({ isAdmin: true });

    const result = await guard.canActivate(buildContext({ userId: 'user-1' }));

    expect(result).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { isAdmin: true },
    });
  });

  it('denies access when the DB says isAdmin is false', async () => {
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });

    await expect(guard.canActivate(buildContext({ userId: 'user-1' }))).resolves.toBe(false);
  });

  it('denies access when the user id on the token no longer matches a real user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(buildContext({ userId: 'ghost' }))).resolves.toBe(false);
  });
});
