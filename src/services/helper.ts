/**
 * @description Convert String to Hash for Pagination Cursor
 * @param str
 */
export const toCursorHash = (str: string): string => {

    if (!str) { return; }

    return Buffer.from(str).toString('base64');

}

/**
 * @description Convert Hash to String for Pagination Cursor
 * @param str
 */
export const fromCursorHash = (str: string): string => {

    if (!str) { return; }

    return Buffer.from(str, 'base64').toString();

}

/**
 * @description Check if password good or not, password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character
 * @param password
 */
export const checkPasswordRegex = async (password: string): Promise<boolean> => {

    if (!password) { return false; }

    const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);

    return passwordRegex.test(password);
}
