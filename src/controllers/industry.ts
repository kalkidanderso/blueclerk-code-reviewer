import {Request, Response} from 'express';
import { Status, Messages } from '../common/constants';

import { Industry, IIndustry } from '../models/Industry';
import { IUser } from '../models/User';

export const createIndustry = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    Industry.findOne({title: params.title}, (err: any, previousIndustry: IIndustry) =>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError});
        }
        
        if(previousIndustry != undefined || previousIndustry != null) {
            return res.json({'status': Status.Error, 'message': 'Industry already created'});
        }

        const industry = new Industry({
            title: params.title,
            createdBy:  user._id
        });
    
        industry.save((err: any) => {
    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }
    
            return res.json({'status': Status.Success, 'message': 'Industry created successfully.'});
    
        });
    });


};

export const getIndustries = (req: Request, res: Response) => {

    Industry.find(
        (err: any, industries: IIndustry[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'industries': industries});    

        }
    );

};


export const removeIndustry = (req: Request, res: Response) => {

    const params = req.body;

    Industry.findOneAndDelete({_id: params.industryId})
        .exec((err: any, industry: IIndustry) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'message': 'Industry removed successfully.'});
        });
};