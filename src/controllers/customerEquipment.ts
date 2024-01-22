import { Request, Response } from 'express';
import { Status, Messages, TagType } from '../common/constants';

import { ICustomerEquipment, CustomerEquipment } from '../models/CustomerEquipment';
import { ICustomer, Customer } from '../models/Customer';
import { Job , IJob} from '../models/Job';
import { Scan, IScan} from '../models/Scan';
import { IUser} from '../models/User';
import { Tag, ITag} from '../models/Tag';
import { ObjectId } from 'mongodb';
import {JobSite} from '../models/JobSite';
import * as Sentry from '@sentry/node';

export const createCustomerEquipment = (req: Request, res: Response) => {

    const params = req.body;

    CustomerEquipment.findOne({'info.nfcTag': params.nfcTag, customer: new ObjectId(params.customerId)},
        async (err: any, customerEquipment: ICustomerEquipment)=>{
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError});
            }
            if(customerEquipment != undefined && customerEquipment != null){
                return res.json({ 'status': Status.Error, 'message': 'Equipment already added.'});
            }

            const newCustomerEquipment: any = {
                info: {
                    model: params.model,
                    serialNumber: params.serialNumber,
                    nfcTag: params.nfcTag,
                    imageUrl: params.imageUrl
                },
                type: params.equipmentTypeId,
                brand: params.equipmentBrandId,
                customer: params.customerId,
            };

            // if (!params.jobLocationId && !params.jobSiteId) {
            //     return res.json({ 'status': Status.Error, 'message': 'Either jobLocation or jobSite is required' });
            // }
            // if (!params.jobLocationId) {
            if (params.jobSiteId) {
                const fullJobSite = await JobSite.findOne({_id : new ObjectId(params.jobSiteId)});
                if (fullJobSite) {
                    newCustomerEquipment['jobLocation'] = fullJobSite.locationId;
                    newCustomerEquipment['jobSite'] = fullJobSite._id;
                }
            }
            if (params.jobLocationId) {
                newCustomerEquipment['jobLocation'] = params.jobLocationId;
            }

            const equipment = new CustomerEquipment(newCustomerEquipment);

            equipment.save((err: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                Customer.findOne(
                    { '_id': params.customerId },
                    (err: any, customer: ICustomer) => {

                        if (err || !customer) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        customer.equipments.push(equipment._id);

                        customer.updateOne(
                            { equipments: customer.equipments },
                            (err: any, raw: any) => {

                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                }

                                if (params.images != undefined && params.images != '') {
                                    const images: any = [];
                                    const urls = params.images.split(',').map(String);
                                    urls.map((url: any)=>{
                                        equipment.images.push(url);
                                    });
                                    equipment.updateOne(
                                        { images: equipment.images },
                                        (err: any, raw: any) => {

                                            if (err) {
                                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                            }
                                            return res.json({ 'status': Status.Success, 'message': 'Customer equipment created successfully.' });
                                        }
                                    );

                                } else {
                                    return res.json({ 'status': Status.Success, 'message': 'Customer equipment created successfully.' });
                                }

                            }
                        );

                    }
                );

            });
        });

};

export const getCustomerEquipments = (req: Request, res: Response) => {

    const params = req.body;

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
        .populate({
            path: 'jobLocation',
            select: 'name location'
        })
        .populate({
            path: 'jobSite',
            select: 'name location'
        })
        .exec((err: any, customerEquipments: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'equipments': customerEquipments });

        });
};


export const getCustomerEquipmentJobs = (req: Request, res: Response) => {
    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    const params = req.body;
    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (customerEquipment == undefined) {
                return res.json({ 'status': Status.Error, 'message': 'No equipment found. Please try again'});
            }

            Scan.find({equipment: customerEquipment._id})
                .populate({
                    path: 'job'
                // select: 'profile.displayName'
                })
                .populate({
                    path: 'equipment',
                    // select: 'profile.displayName'
                    populate: ['jobSite', 'jobLocation']
                })
                .exec(async (err:any, scans: any[])=>{
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                    return res.json({ 'status': Status.Success, 'jobs': scans });
                });

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

        });
};



export const linkJobToEquipment = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    Job.findById(params.jobId)
        .exec((err: any, job: IJob) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
            const customerEquipment = CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag, customer: job.customer });
            const locationTag = Tag.findOne({ 'info.nfcTag': params.nfcTag });

            Promise.all([customerEquipment, locationTag])
                .then((result:  any) => {
                    const equipment = result[0];
                    const tag = result[1];

                    if(equipment != null && equipment != undefined) {

                        return new Promise((resolve, reject) => {

                            Scan.findOne({equipment: equipment._id, job: params.jobId},
                                (err: any, scan: IScan) => {
                                    if (err) {
                                        reject();
                                    }

                                    if (scan != undefined && scan != null) {
                                        reject(new Error('Equipment already scanned for this job.'));
                                        // return res.json({ 'status': Status.Error, 'message': "Equipment already scanned for this job."})
                                    }else{
                                        // create new scan
                                        const newScan = new Scan({
                                            equipment: equipment._id,
                                            job: params.jobId,
                                            comment: params.comment,
                                            user: user._id,
                                            timeOfScan: Date.now()
                                        });
                                        newScan.save((err: any) => {
                                            if (err) {
                                                reject();
                                                // return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                            }

                                            job.updateOne({equipment_scanned: true, no_of_equipment_scanned: job.no_of_equipment_scanned+1 })
                                                .exec((err: any, raw: any) => {
                                                    if (err) {
                                                        reject(err);
                                                        // return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                                    }
                                                    resolve('Equipment scanned successfully');
                                                    // return res.json({ 'status': Status.Success, 'message': 'Equipment scanned successfully.' })
                                                });

                                        });
                                    }


                                });
                        });
                    }else if(tag != null && tag != undefined){
                        return new Promise((resolve, reject) => {
                            Scan.findOne({tag: tag._id, job: params.jobId},
                                (err: any, scan: IScan) => {
                                    if (err) {
                                        reject();
                                    }

                                    if (scan != undefined && scan != null) {
                                        reject(new Error('Tag already scanned for this job.'));
                                    }else{
                                        // create new scan
                                        const newScan = new Scan({
                                            tag: tag._id,
                                            job: params.jobId,
                                            comment: params.comment,
                                            user: user._id,
                                            timeOfScan: Date.now()
                                        });
                                        newScan.save((err: any) => {
                                            if (err) {
                                                reject();
                                            }

                                            job.updateOne({equipment_scanned: true, no_of_equipment_scanned: job.no_of_equipment_scanned+1 })
                                                .exec((err: any, raw: any) => {
                                                    if (err) {
                                                        reject();
                                                    }
                                                    resolve('Tag scanned successfully');
                                                });

                                        });
                                    }


                                });
                        });
                    }else{
                        throw new Error('Tag is not coded for location or equipment');
                    }
                })
                .then((response: any) => {
                    return res.json({ 'status': Status.Success, 'message': response });
                })
                .catch((error: any) => {
                    Sentry.captureException(error);
                    if (error != undefined && error.message != undefined) {
                        return res.json({ 'status': Status.Error, 'message': error.message });
                    } else {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                });
        });
};


export const getCustomerEquipmentInfo = (req: Request, res: Response) => {

    const params = req.body;

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
        .populate('jobLocation')
        .populate('jobSite')
        .exec((err: any, equipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'equipment': equipment });

        });
};


export const getEquipmentJobs = (req: Request, res: Response) => {

    const params = req.body;
    CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, customerEquipment: ICustomerEquipment) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (customerEquipment == undefined || customerEquipment == null) {
                return res.json({ 'status': Status.Error, 'message': 'No equipment found. Please try again'});
            }

            Scan.find({equipment: customerEquipment._id}, '_id')
                .populate({
                    path: 'job',
                    populate: [{ path: 'customer', select: 'profile.displayName' },{ path: 'type', select: 'title description sku' }, 'jobSite', 'jobLocation'],
                })
                .exec((err:any, scans: IScan[])=>{

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'jobs': scans });
                });

        });
};


export const  checkTagAssociation = (req: Request, res: Response) => {

    const params = req.body;

    const tagPromise = Tag.findOne({ 'info.nfcTag': params.nfcTag });
    const equipmentPromise = CustomerEquipment.findOne({ 'info.nfcTag': params.nfcTag });

    Promise.all([tagPromise, equipmentPromise])
        .then((response: any) =>{

            const tag = response[0];
            const equipment = response[1];

            if ((tag == undefined || tag == null) && (equipment != undefined && equipment != null)){
                return res.json({ 'status': Status.Success, 'tagStatus': Status.TagAssociated, 'message': Messages.TagAssociated, 'tagType': TagType.CustomerEquipmentTag });

            } else if ((equipment == undefined || equipment == null) && (tag != undefined && tag != null)){
                return res.json({ 'status': Status.Success, 'tagStatus': Status.TagAssociated, 'message': Messages.TagAssociated, 'tagType': TagType.LocationTag });

            }else{
                return res.json({ 'status': Status.Success, 'tagStatus': Status.TagNotAssociated, 'message': Messages.TagNotAssociated });
            }
        })
        .catch((error) => {
            Sentry.captureException(error);
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message });
            }
            else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
        });


    // const teasfdv
    //     .exec((err: any, equipment: ICustomerEquipment) => {

    //         if (err) {
    //             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
    //         }

    //         if(equipment == undefined || equipment == null) {
    //             return res.json({ 'status': Status.Success, 'tagStatus': Status.TagNotAssociated, 'message': Messages.TagNotAssociated })
    //         }

    //         return res.json({ 'status': Status.Success, 'tagStatus': Status.TagAssociated, 'message': Messages.TagAssociated })

    //     })
};
