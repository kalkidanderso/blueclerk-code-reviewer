import express, {
    Response as ExResponse,
    Request as ExRequest,
    NextFunction,
} from 'express';
import { ValidateError } from 'tsoa';

export const errorHandler = (
    err: any,
    req: ExRequest,
    res: ExResponse,
    next: NextFunction
): ExResponse | void => {
    if (err instanceof ValidateError) {
        return res.status(422).json({
            message: 'Validation Failed',
            details: err?.fields,
        });
    }
    if (err instanceof Error) {
        return res.status(500).json({
            message: err.message,
        });
    }

    next();
};