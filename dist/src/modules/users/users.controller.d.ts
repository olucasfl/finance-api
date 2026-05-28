import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersController {
    private readonly userService;
    constructor(userService: UsersService);
    create(body: CreateUserDto, app?: string): Promise<{
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
    getProfile(req: any): Promise<{
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
    getAllUsers(req: any, search?: string, isAdmin?: string, emailVerified?: string, activeLastDays?: string): Promise<{
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
    getUserDetail(req: any, userId: string): Promise<{
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
    deleteUser(req: any, userId: string): Promise<{
        message: string;
    }>;
    getAdminStats(req: any): Promise<{
        totalUsers: number;
        totalVerified: number;
        consecrationStarted: number;
        prayersPrayed: number;
        rosariesPrayed: number;
    }>;
    setAdminStatus(req: any, id: string, body: {
        isAdmin: boolean;
        adminPassword: string;
    }): Promise<{
        id: string;
        isAdmin: boolean;
    }>;
    getUserActivity(req: any, userId: string): Promise<{
        targetUserId: string;
        activities: {
            type: string;
            action: string;
            timestamp: Date;
        }[];
        total: number;
    }>;
    updateProfile(req: any, body: {
        name: string;
    }): Promise<{
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
    deleteAccount(req: any): Promise<{
        message: string;
    }>;
}
