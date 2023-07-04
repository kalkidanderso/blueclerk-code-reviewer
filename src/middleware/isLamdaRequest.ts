import { NextFunction, Request, Response } from 'express';
import { IBouncedEmail } from 'src/models/BounceEmail';


export const isLambdaRequest = (req: Request, res: Response, next: NextFunction) => {
    const { ['x-api-key'] : apiKey } = req.headers

    if (!apiKey || apiKey !== 'fdd60ad2-1a30-11ee-be56-0242ac120002') {
        res.status(401).send({ message: 'Unauthorized error' })
    }

    next()
}

export const isRequestValid = (req: Request, res: Response, next: NextFunction) => {
    const { email }: IBouncedEmail = req.body

    if (!email) {
        res.status(400).send({ message : 'Email field is required'})
    }

    next()
}