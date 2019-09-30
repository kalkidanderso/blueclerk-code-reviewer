import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { ICustomerEquipment, CustomerEquipment } from '../models/CustomerEquipment'
import { ICustomer, Customer } from '../models/Customer'
import { Job , IJob} from '../models/Job'

export const createCustomerEquipment = (req: Request, res: Response) => {

    const params = req.body

    const equipment = new CustomerEquipment(
        {
            info: {
                model: params.model,
                serialNumber: params.serialNumber,
                nfcTag: params.nfcTag,
                imageUrl: params.imageUrl,
            },
            type: params.equipmentTypeId,
            brand: params.equipmentBrandId,
            customer: params.customerId,
        }
    )

    equipment.save((err: any) => {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        Customer.findOne(
            { '_id': params.customerId },
            (err: any, customer: ICustomer) => {

                if (err || !customer) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                customer.equipments.push(equipment._id)

                customer.update(
                    { equipments: customer.equipments },
                    (err: any, raw: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        return res.json({ 'status': Status.Success, 'message': 'Customer equipment created successfully.' })
                    }
                )

            }
        )

    })

}

export const getCustomerEquipments = (req: Request, res: Response) => {

    const params = req.body

    Customer.findOne({ _id: params.customerId })
        .populate({
            path: 'equipments',
        })
        .exec((err: any, customer: ICustomer) => {

            if (err || !customer) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            res.json({ 'status': Status.Success, 'equipments': customer.equipments })

        })
}


export const getCustomerEquipmentJobs = (req: Request, res: Response) => {

    const params = req.body
    CustomerEquipment.findOne({ _id: params.equipmentId })
        // .populate({
        //     path: 'jobs',
        //     match: {company: req.companyId},
        // })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err || !customerEquipment) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
            var jobIds = customerEquipment.jobs


            Job.find({_id: {$in : jobIds }, company: req.companyId})
            .exec((err: any, companyJobs: IJob[])=>{
                
                if (err || !companyJobs) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                Job.find({_id: {$in : jobIds }, company:  { $ne: req.companyId }}, '_id comment dateTime',)
                .exec((err: any, nonCompanyJobs: IJob[])=>{
                    
                    if (err || !nonCompanyJobs) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }
    
                    var allJobs = companyJobs.concat(nonCompanyJobs)

                    // return res.json({ 'status': Status.Success, 'jobs': allJobs })

                    allJobs.sort(function(a, b){
                        var keyA = new Date(a.dateTime),
                            keyB = new Date(b.dateTime);
                        // Compare the 2 dates
    
                        if(keyA > keyB) return -1;
                        if(keyA < keyB) return 1;
                        return 0;
                    });
                    
                    return res.json({ 'status': Status.Success, 'jobs': allJobs })

                })
                
            })

        })
}



export const linkEquipmentJob = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err || !customerEquipment) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            var index = customerEquipment.jobs.indexOf(params.jobId)

            if (index !== -1) {
                return res.json({ 'status': Status.Error, 'message': 'Job already linked to equipment.' })
            }

            customerEquipment.jobs.push(params.jobId)
            customerEquipment.updateOne(
                { jobs: customerEquipment.jobs },
                (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Customer equipment job added successfully.' })
                }
            )
        })

}