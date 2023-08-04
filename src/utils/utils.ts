import SourceCodeLine from "../model/SourceCodeLine";

export function hashCode(s: string): number {

    if (!s || !s.length) {
        return 0;
    }

    const n = s.length;
    let hash = 0;
    for (let i = 0; i < n; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0; // (as 32 bit integer)
    }
    return hash;
}

export function extractRawInstruction(rawPart: string): string | undefined {

    return normalizeAndSplitQuotesAware(rawPart, undefined).getParts().shift()?.getPart();
}

export function normalizeAndSplitQuotesAware(s: string, separator: string | undefined): SourceCodeLine {

    var sourceCodeLine: SourceCodeLine = new SourceCodeLine();

    const n = s.length;
    for (let i = 0; i < n; i++) {

        // For every part
        let currentPart = "";
        let quoted = null;
        let whitespace = -1;
        for (; i < n; i++) {
            const c = s.charAt(i);

            // Inside quotes
            if (quoted) {
                currentPart += c;
                if (c === quoted) {
                    quoted = null;
                }
                continue;
            }

            // Comment?
            const isCommentStart = (c === ";")
                || (c === "/") && (i + 1 < n) && (s.charAt(i + 1) === "/")
                ? c
                : undefined;
            if (isCommentStart) {
                sourceCodeLine.addPart(currentPart);
                sourceCodeLine.setComment(s.substring(isCommentStart === ";" ? i + 1 : i + 2).trim());
                return sourceCodeLine;
            }

            // Separator?
            if (separator && c === separator) {
                break;
            }

            // Whitespace?
            if (/\s/.test(c)) {
                whitespace = whitespace < 0 ? -1 : 1;
                continue;
            }

            // Not whitespace
            if (whitespace > 0) {
                currentPart += " ";
            }
            whitespace = 0;

            // Quote?
            if ((c === "\"")
                // Prevents considering "'" as a quote
                // when parsing the instruction "ex af,af'"
                || ((c === "'") && (!/^ex\s*af\s*,\s*af$/i.test(currentPart)))) {
                quoted = c;
            }

            currentPart += c.toUpperCase();
        }

        sourceCodeLine.addPart(currentPart);
    }

    return sourceCodeLine;
}

export function extractMnemonicOf(s: string): string {

    const i = s.indexOf(" ");
    return i === -1 ? s : s.substring(0, i);
}

export function extractOperandsOf(s: string): string[] {

    const i = s.indexOf(" ");
    return i === -1 ? [] : s.substring(i + 1).split(/\s*,\s*/);
}

export function extractOperandsOfQuotesAware(s: string): string[] {

    const i = s.indexOf(" ");
    return i === -1
        ? []
        : normalizeAndSplitQuotesAware(s.substring(i + 1), ",").getPartsAsString();
}

/**
 * @param operand the operand of the instruction
 * @returns true if the candidate operand must match verbatim the operand of the instruction
 */
export function isVerbatimOperand(operand: string): boolean {
    return ["A", "AF", "AF'", "B", "BC", "C", "NC",
        "D", "DE", "E", "H", "HL", "L",
        "I", "IX", "IY", "R", "SP",
        "Z", "NZ", "M", "P", "PE", "PO"].indexOf(operand) !== -1;
}

/**
 * @param expectedOperand the operand of the instruction
 * @param candidateOperand the operand from the cleaned-up line
 * @returns 1 if the candidate operand is a perfect match,
 * 0 if the candidate operand is not valid
 */
export function verbatimOperandScore(expectedOperand: string, candidateOperand: string): number {
    return (candidateOperand === expectedOperand) ? 1 : 0;
}

/**
 * @param operand the operand of the instruction or the candidate operand
 * @param strict true to only accept parenthesis, false to also accept brackets
 */
export function isIndirectionOperand(operand: string, strict: boolean): boolean {

    if (operand.startsWith("(") && operand.endsWith(")")) {
        return true;
    }
    if (strict) {
        return false;
    }
    return (operand.startsWith("[") && operand.endsWith("]"));
}

/**
 * @param expectedOperand the operand of the instruction
 * @param candidateOperand the operand from the cleaned-up line
 * @returns number between 0 and 1 with the score of the match,
 * or undefined if SDCC index register indirection syntax is not allowed or not found
 */
export function sdccIndexRegisterIndirectionScore(expectedOperand: string, candidateOperand: string): number | undefined {

    // Depending on the expected indirection...
    switch (extractIndirection(expectedOperand)) {
        case "IX+o":
            return candidateOperand.match(/(\(\s*IX\s*\)|\[\s*IX\s*\])$/) ? 1 : undefined;
        case "IY+o":
            return candidateOperand.match(/(\(\s*IY\s*\)|\[\s*IY\s*\])$/) ? 1 : undefined;
        default:
            return undefined;
    }
}

/**
 * @param operand the operand of the instruction or the candidate operand
 * @returns the expression inside the indirection
 */
export function extractIndirection(operand: string): string {
    return operand.substring(1, operand.length - 1).trim();
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is one of the 8 bit general purpose registers, 0 otherwise
 */
export function is8bitRegisterScore(operand: string): number {
    return ["A", "B", "C", "D", "E", "H", "L"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the IX index register with an optional offset, 0 otherwise
 */
export function isIXWithOffsetScore(operand: string): number {
    return operand.match(/^IX(\W|$)/) ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the IY index register with an optional offset, 0 otherwise
 */
export function isIYWithOffsetScore(operand: string): number {
    return operand.match(/^IY(\W|$)/) ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the high part of the IX index register, 0 otherwise
 */
export function isIXhScore(operand: string): number {
    return ["IXH", "IXU", "XH", "HX"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the low part of the IX index register, 0 otherwise
 */
export function isIXlScore(operand: string): number {
    return ["IXL", "XL", "LX"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the high or low part of the IX index register, 0 otherwise
 */
export function isIX8bitScore(operand: string): number {
    return ["IXH", "IXL", "IXU", "XH", "XL", "HX", "LX"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the high part of the IY index register, 0 otherwise
 */
export function isIYhScore(operand: string): number {
    return ["IYH", "IYU", "YH", "HY"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the low part of the IY index register, 0 otherwise
 */
export function isIYlScore(operand: string): number {
    return ["IYL", "YL", "LY"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is the high or low part of the IY index register, 0 otherwise
 */
export function isIY8bitScore(operand: string): number {
    return ["IYH", "IYL", "IYU", "YH", "YL", "HY", "LY"].indexOf(operand) !== -1 ? 1 : 0;
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is a register where H and L have been replaced by IXh and IXl, 0 otherwise
 */
export function is8bitRegisterReplacingHLByIX8bitScore(operand: string): number {
    return ["A", "B", "C", "D", "E"].indexOf(operand) !== -1 ? 1 : isIX8bitScore(operand);
}

/**
 * @param operand the candidate operand
 * @returns 1 if the operand is a register where H and L have been replaced by IYh and IYl, 0 otherwise
 */
export function is8bitRegisterReplacingHLByIY8bitScore(operand: string): number {
    return ["A", "B", "C", "D", "E"].indexOf(operand) !== -1 ? 1 : isIY8bitScore(operand);
}

/**
 * @param operand the candidate operand
 * @returns true if the operand is any 8 or 16 bit register,
 * including the IX and IY index registers with an optional offset,
 * false otherwise
 */
export function isAnyRegister(operand: string): boolean {
    return !!operand.match(/(^(A|AF'?|BC?|C|DE?|E|HL?|L|I|I[XY][UHL]?|R|SP)$)|(^I[XY]\W)/);
}

/**
 * @param operand the operand of the instruction
 * @returns true if the operand is a flag for conditional operations
 */
export function isAnyCondition(operand: string): boolean {
    return ["C", "NC", "Z", "NZ", "M", "P", "PE", "PO"].indexOf(operand) !== -1;
}

/**
 * @param operand the operand of the instruction
 * @returns true if the operand is a flag for conditional JR
 */
export function isJrCondition(operand: string): boolean {
    return ["C", "NC", "Z", "NZ"].indexOf(operand) !== -1;
}

/**
 * @param operand the candidate operand
 * @returns 0.75 if the operand is any constant, label, or expression
 */
export function anySymbolOperandScore(candidateOperand: string): number {

    // (due possibility of using constants, labels, and expressions in the source code,
    // there is no proper way to discriminate: b, n, nn, o;
    // but uses a "best effort" to discard registers)
    return isAnyRegister(
        isIndirectionOperand(candidateOperand, false)
            ? extractIndirection(candidateOperand)
            : candidateOperand)
        ? 0
        : 0.75;
}

export function parseTimingsLenient(o: unknown): number[] | undefined {

    return (typeof o === "number") ? [o, o]
        : (typeof o === "string") ? parseTimings(o)
            : undefined;
}

export function parseTimings(s: string): number[] {

    const ss = s.split("/");
    const t0 = parseInt(ss[0], 10);
    return ss.length === 1 ? [t0, t0] : [t0, parseInt(ss[1], 10)];
}

export function formatTiming(t: number[]): string {
    return t[0] === t[1] ? t[0].toString() : t[0] + "/" + t[1];
}

export function parteIntLenient(o: unknown): number {

    return (typeof o === "number") ? o
        : (typeof o === "string") ? parseInt(o, 10)
            : NaN;
}

export function undefinedIfNaN(n: number): number | undefined {

    return isNaN(n) ? undefined : n;
}

export function formatHexadecimalByte(n: number): string {

    const s = "00" + ((n & 0xff).toString(16).toUpperCase());
    return s.substring(s.length - 2);
}
