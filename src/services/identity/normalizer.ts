export function normalizeIdentityValue(value: unknown): string {
    if (typeof value !== "string") return "";

    return value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/-/g, "");
}