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

    if (num === undefined || num === null) { return 0; }

    return Math.round(num * 100) / 100;
}

/**
 * @description To wait with a custom time
 * @param ms (milisecond)
 */
 export const waitTimer = (ms: any) => {
    return new Promise(res => setTimeout(res, ms));
}

/**
 * @description To construct regex syntax for database query usage
 * @param str
 * @param regexOption optional additional regex option
 */
export const getRegex = (str: string, regexOption: string): { $regex: string, $options: string } => {
    return { $regex: str, $options: regexOption };
}
