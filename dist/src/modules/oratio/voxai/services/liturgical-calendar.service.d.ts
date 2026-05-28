interface LiturgicalData {
    data?: string;
    festas?: {
        principal?: {
            nome: string;
            cor: string;
            grau: string;
            classe: string;
        };
        primeira?: {
            nome: string;
            cor: string;
            grau: string;
            classe: string;
        };
        segunda?: {
            nome: string;
            cor: string;
            grau: string;
            classe: string;
        };
    };
    leitoras?: {
        primeira?: {
            titulo: string;
            referencia: string;
            texto: string;
        };
        segunda?: {
            titulo: string;
            referencia: string;
            texto: string;
        };
        evangelio?: {
            titulo: string;
            referencia: string;
            texto: string;
        };
    };
}
export declare class LiturgicalCalendarService {
    private cache;
    private readonly CACHE_EXPIRY;
    private readonly API_URL;
    private formatDate;
    getLiturgicalData(date?: Date): Promise<LiturgicalData | null>;
    private formatLiturgicalInfo;
    getLiturgicalContext(requestedDate?: Date): Promise<string>;
    getDayInfo(offsetDays?: number): Promise<{
        date: string;
        info: string;
    }>;
}
export {};
