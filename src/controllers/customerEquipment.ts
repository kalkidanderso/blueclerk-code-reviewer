import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { ICustomerEquipment, CustomerEquipment } from '../models/CustomerEquipment'
import { ICustomer, Customer } from '../models/Customer'
import { Job , IJob} from '../models/Job'
import { Scan, IScan} from '../models/Scan'
import { IUser} from '../models/User'
import { ObjectId } from 'mongodb'
import { isNull } from 'util'

export const createCustomerEquipment = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.findOne({'info.nfcTag': params.nfcTag, customer: new ObjectId(params.customerId)}, 
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

                            if (params.images != undefined && params.images != '') {
                                var images: any = []
                                var urls = params.images.split(',').map(String)
                                urls.map((url: any)=>{
                                    equipment.images.push(url)        
                                })
                                equipment.updateOne(
                                    { images: equipment.images },
                                    (err: any, raw: any) => {
                
                                        if (err) {
                                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                        }
                                        return res.json({ 'status': Status.Success, 'message': 'Customer equipment created successfully.' })
                                    }
                                )

                            } else {
                                return res.json({ 'status': Status.Success, 'message': 'Customer equipment created successfully.' })
                            }
    
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
        .populate({
            path: 'customer',
            select: 'profile.displayName'
        })
        .exec((err: any, customerEquipments: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'equipments': customerEquipments })

        })
}


export const getCustomerEquipmentJobs = (req: Request, res: Response) => {
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    const params = req.body
    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (customerEquipment == undefined || customerEquipment == null) {
                return res.json({ 'status': Status.Error, 'message': 'No equipment found. Please try again'})
            }

            Scan.find({equipment: customerEquipment._id})
            .populate({
                path: 'job',
                // select: 'profile.displayName'
            })
            .populate({
                path: 'equipment',
                // select: 'profile.displayName'
            })
            .exec((err:any, scans: IScan[])=>{

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                return res.json({ 'status': Status.Success, 'jobs': scans })
            })

            // var jobIds = customerEquipment.jobs


            // Job.find({_id: {$in : jobIds }, company: companyId})
            // .populate({
            //     path: 'technician',
            //     select: 'profile.displayName'
            // })
            // .populate({
            //     path: 'customer',
            //     select: 'info.name'
            // })
            // .populate({
            //     path: 'type',
            //     select: 'title'
            // })
            // .populate({
            //     path: 'company',
            //     select: 'info.companyName'
            // })
            // .exec((err: any, companyJobs: IJob[])=>{
                
            //     if (err || !companyJobs) {
            //         return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            //     }

            //     Job.find({_id: {$in : jobIds }, company:  { $ne: companyId }}, '_id comment dateTime',)
            //     .exec((err: any, nonCompanyJobs: IJob[])=>{
                    
            //         if (err || !nonCompanyJobs) {
            //             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            //         }
    
            //         var allJobs = companyJobs.concat(nonCompanyJobs)

            //         allJobs.sort(function(a, b){
            //             var keyA = new Date(a.dateTime),
            //                 keyB = new Date(b.dateTime);
            //             // Compare the 2 dates
    
            //             if(keyA > keyB) return -1;
            //             if(keyA < keyB) return 1;
            //             return 0;
            //         });
                    
            //         return res.json({ 'status': Status.Success, 'jobs': allJobs })

            //     })
                
            // })

        })
}



export const linkJobToEquipment = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    Job.findById(params.jobId)
    .exec((err: any, job: IJob) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag, customer: job.customer })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
            
            if (customerEquipment == undefined || customerEquipment == null) {
                return res.json({ 'status': Status.InvalidEquipment, 'message': "Invalid Customer Equipment"})
            }

            Scan.findOne({equipment: customerEquipment._id, job: params.jobId}, 
                (err: any, scan: IScan) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }
                    
                    if (scan != undefined && scan != null) {
                        return res.json({ 'status': Status.Error, 'message': "Equipment already scanned for this job."})
                    }

                    // create new scan
                    const newScan = new Scan({
                        equipment: customerEquipment._id,
                        job: params.jobId,
                        comment: params.comment,
                        user: user._id,
                        timeOfScan: Date.now()
                    })
                    newScan.save((err: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        job.updateOne({equipment_scanned: true, no_of_equipment_scanned: job.no_of_equipment_scanned+1 })
                        .exec((err: any, raw: any) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            return res.json({ 'status': Status.Success, 'message': 'Equipment scanned successfully.' })
                        })

                    })
                })
    
        })
    })

    

}


export const getCustomerEquipmentInfo = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag }, 'info.model info.serialNumber info.location images')
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'brand',
            select: 'title'
        })
        .populate({
            path: 'customer',
            select: 'profile.displayName address.street address.city address.state address.zipCode contactName'
        })
        .exec((err: any, equipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'equipment': equipment })

        })
}


export const getEquipmentJobs = (req: Request, res: Response) => {

    const params = req.body
    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (customerEquipment == undefined || customerEquipment == null) {
                return res.json({ 'status': Status.Error, 'message': 'No equipment found. Please try again'})
            }

            Scan.find({equipment: customerEquipment._id}, '_id')
            .populate({
                path: 'job',
                populate: [{ path: 'customer', select: 'profile.displayName' },{ path: 'type', select: 'title' }],
            })
            .exec((err:any, scans: IScan[])=>{

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                return res.json({ 'status': Status.Success, 'jobs': scans })
            })

        })
}


export const checkTagAssociation = (req: Request, res: Response) => {

    const params = req.body

    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, equipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(equipment == undefined || equipment == null) {
                return res.json({ 'status': Status.Success, 'tagStatus': Status.TagNotAssociated, 'message': Messages.TagNotAssociated })
            }

            return res.json({ 'status': Status.Success, 'tagStatus': Status.TagAssociated, 'message': Messages.TagAssociated })

        })
}
