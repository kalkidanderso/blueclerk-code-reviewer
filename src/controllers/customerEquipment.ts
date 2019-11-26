import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { ICustomerEquipment, CustomerEquipment } from '../models/CustomerEquipment'
import { ICustomer, Customer } from '../models/Customer'
import { Job , IJob} from '../models/Job'
import { ObjectId } from 'mongodb'
import { isNull } from 'util'

export const createCustomerEquipment = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.findOne({'info.nfcTag': params.nfcTag}, 
    (err: any, customerEquipment: ICustomerEquipment)=>{
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if(customerEquipment != undefined && !isNull(customerEquipment)){
            return res.json({ 'status': Status.Error, 'message': 'Equipment already added.'})
            
        }
        const equipment = new CustomerEquipment(
            {
                info: {
                    model: params.model,
                    serialNumber: params.serialNumber,
                    nfcTag: params.nfcTag,
                    imageUrl: params.imageUrl,
                    location: params.location,
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
    
                    customer.updateOne(
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
    })

}

export const getCustomerEquipments = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.find({ customer: new ObjectId(params.customerId) })
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'brand',
            select: 'title'
        })
        .exec((err: any, customerEquipments: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            res.json({ 'status': Status.Success, 'equipments': customerEquipments })

        })
}


export const getCustomerEquipmentJobs = (req: Request, res: Response) => {

    const params = req.body
    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err || !customerEquipment) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
            var jobIds = customerEquipment.jobs


            Job.find({_id: {$in : jobIds }, company: req.companyId})
            .populate({
                path: 'technician',
                select: 'profile.displayName'
            })
            .populate({
                path: 'customer',
                select: 'info.name'
            })
            .populate({
                path: 'type',
                select: 'title'
            })
            .populate({
                path: 'company',
                select: 'info.companyName'
            })
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



export const linkJobToEquipment = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError, "err": err })
            }
            
            if (customerEquipment == undefined || customerEquipment == null) {
                return res.json({ 'status': Status.Error, 'message': "Customer Equipment not found"})
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

                    if(params.comment != undefined || params.comment != null) {
                        Job.updateOne({_id: params.jobId}, {comment: params.comment, equipmentId:customerEquipment._id, timeOfScan: Date.now() }, (err: any, raw: any) =>{

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
                            return res.json({ 'status': Status.Success, 'message': 'Customer equipment job added successfully.' })
                        })
                    }else{
                        Job.updateOne({_id: params.jobId}, {equipmentId:customerEquipment._id, timeOfScan: Date.now() }, (err: any, raw: any) =>{

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
                            return res.json({ 'status': Status.Success, 'message': 'Customer equipment job added successfully.' })
                        })
                        // return res.json({ 'status': Status.Success, 'message': 'Customer equipment job added successfully.' })
                    }

                }
            )
        })

}