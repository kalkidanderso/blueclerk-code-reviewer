import bcrypt from "bcrypt-nodejs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

export class UserServices {
    constructor(private readonly prisma: PrismaClient['user']) {}

    async comparePassword (password: string, passwordHash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, passwordHash, (err: Error, isMatch: boolean) => {
                resolve(isMatch);
            });
        })
    }

    jwt(userId: number, sessionID: string) : string {
        const token = jwt.sign(
            {
                iss: "http://api.blueclerk.com",
                id: userId,
                sessionID: sessionID
            }, process.env.jwt_encryption,
            {
                expiresIn: parseInt(process.env.jwt_expiration)
            }
        );
        
        return `Bearer ${token}`;
    }

}