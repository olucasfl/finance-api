import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { MailService } from '../mail/mail.service';
export declare class UsersService {
    private readonly prisma;
    private readonly mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    create(data: CreateUserDto, app?: string): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        emailVerificationToken: string | null;
        emailVerified: boolean;
        passwordResetExpires: Date | null;
        passwordResetToken: string | null;
        isAdmin: boolean;
        bolaoPoints: number;
        cravadas: number;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        emailVerified: boolean;
        isAdmin: boolean;
        bolaoPoints: number;
        cravadas: number;
        spiritualProgress: {
            consecrationStarted: boolean;
            daysCompleted: number;
            prayersPrayed: number;
            rosariesPrayed: number;
            lastPrayerDate: Date | null;
            prayerStreak: number;
        };
    }>;
    updateProfile(userId: string, name: string): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        emailVerificationToken: string | null;
        emailVerified: boolean;
        passwordResetExpires: Date | null;
        passwordResetToken: string | null;
        isAdmin: boolean;
        bolaoPoints: number;
        cravadas: number;
    }>;
    deleteAccount(userId: string): Promise<{
        message: string;
    }>;
    assertAdmin(userId: string): Promise<void>;
    getAllUsers(userId: string, filters?: {
        search?: string;
        isAdmin?: boolean;
        emailVerified?: boolean;
        activeLastDays?: number;
    }): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        emailVerified: boolean;
        isAdmin: boolean;
        spiritualStats: {
            id: string;
            userId: string;
            rosariesPrayed: number;
            prayersPrayed: number;
            prayerStreak: number;
            lastPrayerDate: Date | null;
            lastLoginDate: Date | null;
        } | null;
    }[]>;
    getUserDetail(userId: string, targetUserId: string): Promise<{
        consecration: {
            started: boolean;
            daysCompleted: number;
        };
        consecrations: undefined;
        completedConsecrationDays: undefined;
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        emailVerified: boolean;
        isAdmin: boolean;
        spiritualStats: {
            rosariesPrayed: number;
            prayersPrayed: number;
            prayerStreak: number;
            lastPrayerDate: Date | null;
        } | null;
    }>;
    deleteUserAdmin(userId: string, targetUserId: string): Promise<{
        message: string;
    }>;
    getUserActivity(userId: string, targetUserId: string): Promise<{
        targetUserId: string;
        activities: {
            type: string;
            action: string;
            timestamp: Date;
        }[];
        total: number;
    }>;
    getAdminStats(userId: string): Promise<{
        totalUsers: number;
        totalVerified: number;
        consecrationStarted: number;
        prayersPrayed: number;
        rosariesPrayed: number;
    }>;
    setAdminStatus(userId: string, targetUserId: string, isAdmin: boolean, adminPassword: string): Promise<{
        id: string;
        isAdmin: boolean;
    }>;
}
