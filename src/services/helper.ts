/**
 * @description Convert String to Hash for Pagination Cursor
 * @param str
 */
export const toCursorHash = (str: string): string => {

    if (!str) { return; }

    return Buffer.from(str).toString('base64');

}

/**
 * @description Conver Hash to String for Pagination Cursor
 * @param str
 */
export const fromCursorHash = (str: string): string => {

    if (!str) { return; }

    return Buffer.from(str, 'base64').toString();

}

/**
 * @description Convert number to a two decimals place
 * @param num
 */
export const roundTwoDecimal = (num: number): number => {

    if (!num) { return; }

    return Math.round(num * 100) / 100;
}

export const waitTimer = (ms: any) => {
    return new Promise(res => setTimeout(res, ms));
}

/**
 * @description To wait with a custom time
 * @param ms (milisecond)
 */
 export const waitTimer = (ms: any) => {
    return new Promise(res => setTimeout(res, ms));
}