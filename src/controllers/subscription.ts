import {Request, Response} from 'express'
import {Status, Messages, ContractStatus, EmployeeStatus, Role, CompanyType} from '../common/constants'
import { chargeSubscription} from '../services/stripe'
import { ICompany, Company } from '../models/Company'
import {Contract} from '../models/Contract';
import {Employee} from '../models/Employee';
import { ObjectId } from 'mongodb'

export const addCompanySubscriptions = (req: Request, res: Response) => {

    const company = <ICompany>req.company
    const params = req.body
/*    if (company.paid == false &&  new Date() > company.chargeDate) {
        return res.json({ 'status': Status.Error, 'message': 'You can\'t buy subscription contact blueclerk admin for details.' })
    }
 */
    if(company.stripeId == undefined || company.stripeId == '') {
        return res.json({status: Status.Error, message: "Company payment method required."})
    }

    const now = new Date();
    const daysRemaining = now.getDate()
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
    const daysToCharge = daysInCurrentMonth-daysRemaining + 1

    var amount: number = 0;

    if(params.noOfOfficeAdmins > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfOfficeAdmins * (perday* daysToCharge))
    }

    if(params.noOfTechnicians > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfTechnicians * (perday *daysToCharge))
    }

    if(params.noOfManagers > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfManagers * (perday * daysToCharge))
    }

    if(params.nbOfAdmins > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.nbOfAdmins * (perday * daysToCharge))
    }
    if (amount == 0) {

        return res.json({ 'status': Status.Error, 'message': "Invalid number of subscriptions."});
    }

    chargeSubscription( amount , company.stripeId, (status:any, charge: any, message: any)=>{
        if(status == 1){

            const noOfTechs: number = company.maxTechnicians + parseInt(params.noOfTechnicians)
            const noOfManagers: number = company.maxManagers + parseInt(params.noOfManagers)
            const noOfOfficeAdmins: number = company.maxOfficeAdmins + parseInt(params.noOfOfficeAdmins)
            const nbOfAdmins: number = company.maxAdmins + parseInt(params.nbOfAdmins)
            company.updateOne({maxTechnicians: noOfTechs, maxManagers: noOfManagers, maxOfficeAdmins: noOfOfficeAdmins, maxAdmins: nbOfAdmins, paid: true, type: CompanyType.SUBSCRIBED })
            .exec((err: any, raw: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': err.message})
                }

                return res.json({'status': Status.Error, 'message': 'Company subscriptions added successfully!.'})
            })

        } else {
            return res.json({status: Status.Error, message: message})
        }
    })
}

export const removeCompanySubscriptions = async (req: Request, res: Response) => {

    const company = <ICompany>req.company
    const params = req.body
    if (company.paid == false && new Date() > company.chargeDate) {
        return res.json({
            'status': Status.Error,
            'message': `Your Company Does Not Have Any Subscription To Cancel!`
        })
    }
    const employeeId = params.employeeId;
    let checkEmployeeRelatedToCompany = await Employee.findOne({
        _id: new ObjectId(employeeId),
        status: EmployeeStatus.ACTIVE
    });
    if (!checkEmployeeRelatedToCompany) {
        return res.json({status: Status.Error, message: "Invalid Employee Id."})
    }
    switch (checkEmployeeRelatedToCompany.permissions.role) {
        case Role.TECHNICIAN: {
            company.maxTechnicians--;
            break;
        }
        case Role.MANAGER: {
            company.maxManagers--;
            break;
        }
        case Role.OFFICE_ADMIN: {
            company.maxOfficeAdmins--;
            break;
        }
        case Role.GLOBAL_ADMIN: {
            company.maxAdmins--;
        }
    }
    company.save().then(() => {
        checkEmployeeRelatedToCompany.status = EmployeeStatus.INACTIVE;
        checkEmployeeRelatedToCompany.save();
        return res.json({'status': Status.Error, 'message': 'Employee Subscription Have Been Deleted Successfully.'})
    }).catch((err) => {
        return res.json({'status': Status.Error, 'message': err.message})
    })
}

export const chargeCompanySubscription = (req: Request, res: Response) => {

    Company.find(
        {$or: [{maxManagers: { $gt: 0 }}, {maxOfficeAdmins: { $gt: 0 }}, {maxTechnicians: { $gt: 0 }}, {maxAdmins: { $gt: 0 }}]  },
        async (err: any, companies: ICompany[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            const companiesToCharge:number = companies.length
            let companiesCharged: number = 0;
            for (let index = 0; index < companies.length; index++) {
                const company = companies[index];

                var amount: number = 0;

                if(company.maxOfficeAdmins > 0){
                    amount = amount + (company.maxOfficeAdmins * 30)
                }
                if(company.maxManagers > 0){
                    amount = amount + (company.maxManagers * 30)
                }
                if(company.maxTechnicians > 0){
                    amount = amount + (company.maxTechnicians * 30)
                }
                if(company.maxAdmins > 0){
                    amount = amount + (company.maxAdmins * 30)
                }
                const nbOfContractors = await Contract.countDocuments({company: company._id, status: ContractStatus.ACCEPTED});
                if (nbOfContractors > 0) {
                    amount = amount + (nbOfContractors * 3)
                }

                if(amount > 0) {
                    chargeSubscription( amount , company.stripeId, (status:any, charge: any, message: any)=>{
                        if(status == 1){
                            companiesCharged ++;
                            if(companiesToCharge == companiesCharged) {
                                // we need to send an email to the company to let it know that the transaction was successfully done!
                                return res.json({'status': Status.Success, 'message': 'Done.'})
                            }

                        }else{
                            // We need to send an email to the company to update their payment information
                            return res.json({'status': Status.Error, 'message': 'Unable to Charge Company: ' + company._id});
                        }
                    })
                }

            }

        })
}
