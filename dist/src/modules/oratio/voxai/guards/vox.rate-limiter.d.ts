export declare class VoxRateLimiter {
    private requests;
    check(userId: string): {
        allowed: boolean;
        message: string;
    } | {
        allowed: boolean;
        message?: undefined;
    };
}
