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

export const waitTimer = (ms: any) => {
    return new Promise(res => setTimeout(res, ms));
}
