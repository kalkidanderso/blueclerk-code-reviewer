import {Request, Response} from 'express';
import { Status, Messages } from '../common/constants';

import {  Order, IOrder } from '../models/Order';
import { OrderStatus } from '../common/constants';
import {  Company, ICompany } from '../models/Company';
import { chargeCustomer } from '../services/stripe';
import { CompanyCard , ICompanyCard} from '../models/CompanyCard';
import { ObjectId } from 'mongodb';

export const placeOrder = (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    /*
    if (company.paid == false &&  new Date() > company.chargeDate) {
        return res.json({ 'status': Status.Error, 'message': 'You can\'t buy tags contact blueclerk admin for details.' })
    }*/

    if(company.stripeId == undefined || company.stripeId == ''){
        return res.json({status: Status.Error, message: 'Company payment method required.'});
    }

    CompanyCard.findById(params.cardId,
        (err: any, card: ICompanyCard)=> {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            chargeCustomer(params.total, company.stripeId, card.cardStripeId, (status: any, charge: any, message: any)=>{
                if(status == 1){

                    const order = new Order(
                        {
                            info:{
                                noOfTags: params.noOfTags,
                                total: params.total,
                                tax: params.tax,
                                Status: OrderStatus.PLACED
                            },
                            address: {
                                street: params.street,
                                city: params.city,
                                state: params.state,
                                zipCode: params.zipCode
                            },
                            company: req.companyId,
                            stripeChargeId: charge.id,
                        }
                    );

                    order.save((err: any) => {

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        // charge the amount to company

                        return res.json({'status': Status.Success, 'message': 'Order placed successfully.'});

                    });
                    // return res.json({status: Status.Success, message: "Order placed successfully."});


                } else {
                    return res.json({status: Status.Error, message: message});
                }
            });

        });

};

export const getOrders = (req: Request, res: Response) => {

    Order.find(
        { company: new ObjectId(req.companyId) },
        '_id info.noOfTags info.total info.tax info.status',
        (err: any, orders: IOrder[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'orders': orders});

        }
    );

};


