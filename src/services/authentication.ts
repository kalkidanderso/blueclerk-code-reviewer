import { IUser } from '../models/User';

export const compareUserPassword = async (user: IUser, password: string) => {
    
    return user.comparePassword(password, (isMatching: boolean) => {
        return isMatching;
    });

};
