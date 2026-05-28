export declare class MailService {
    private readonly logger;
    private readonly apiUrl;
    private buildTemplate;
    private buildOratioTemplate;
    private sendEmail;
    sendVerificationEmail(email: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, token: string): Promise<void>;
    sendOratioVerificationEmail(email: string, token: string): Promise<void>;
    sendOratioPasswordResetEmail(email: string, token: string): Promise<void>;
}
