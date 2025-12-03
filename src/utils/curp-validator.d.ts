export interface CurpValidationResult {
    isValid: boolean;
    normalized: string;
    reasons: string[];
    data?: {
        year: number;
        month: number;
        day: number;
        gender: "H" | "M";
        state: string;
    } | null;
}
export declare function validateCurp(curp: string): CurpValidationResult;
//# sourceMappingURL=curp-validator.d.ts.map