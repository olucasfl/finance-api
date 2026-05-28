export interface R32SlotDefinition {
    slot: number;
    homeDesc: string;
    awayDesc: string;
    homeSource: {
        pos: number;
        group: string;
    } | null;
    awaySource: {
        pos: number;
        group: string;
    } | null;
    awayIsThird: boolean;
    thirdGroups: string[];
}
export declare const R32_SLOT_DEFINITIONS: R32SlotDefinition[];
export declare const R16_BRACKET: {
    slot: number;
    homeFromR32: number;
    awayFromR32: number;
}[];
export declare const QF_BRACKET: {
    slot: number;
    homeFromR16: number;
    awayFromR16: number;
}[];
export declare const SF_BRACKET: {
    slot: number;
    homeFromQF: number;
    awayFromQF: number;
}[];
export declare const FINAL_BRACKET: {
    slot: number;
    homeFromSF: number;
    awayFromSF: number;
}[];
