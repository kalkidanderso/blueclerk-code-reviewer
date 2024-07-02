import * as _ from 'lodash';
/**
 * @description Convert String to Hash for Pagination Cursor
 * @param str
 */
export const toCursorHash = (str: string): string => {
    if (!str) {
        return;
    }

    return Buffer.from(str).toString('base64');
};

/**
 * @description Convert Hash to String for Pagination Cursor
 * @param str
 */
export const fromCursorHash = (str: string): string => {
    if (!str) {
        return;
    }

    return Buffer.from(str, 'base64').toString();
};

/**
 * @description Convert number to a two decimals place
 * @param num
 */
export const roundTwoDecimal = (num: number): number => {
    if (num === undefined || num === null) {
        return 0;
    }

    return Math.round(num * 100) / 100;
};

export const delimiterEnUs = (num: number): string => {
    if (num === undefined || num === null) {
        return '';
    }

    return `$${roundTwoDecimal(num)?.toLocaleString('en-US')}`;
};

/**
 * @description Check if password good or not, password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character
 * @param password
 */
export const checkPasswordRegex = async (password: string): Promise<boolean> => {
    if (!password) {
        return false;
    }

    const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);

    return passwordRegex.test(password);
};

/**
 * @description To wait with a custom time
 * @param ms (milisecond)
 */
export const waitTimer = (ms: any) => {
    return new Promise((res) => setTimeout(res, ms));
};

/**
 * @description To construct regex syntax for database query usage
 * @param str
 * @param regexOption optional additional regex option
 */
export const getRegex = (str: string, regexOption: string): { $regex: string; $options: string } => {
    return { $regex: str, $options: regexOption };
};

export const toTitleCase = (str: string): string => {
    if (!str) {
        return;
    }

    return _.startCase(_.lowerCase(str));
};
