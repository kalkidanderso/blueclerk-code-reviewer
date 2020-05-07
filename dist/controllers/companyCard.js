"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CompanyCard_1 = require("../models/CompanyCard");
const stripe_1 = require("../services/stripe");
const mongodb_1 = require("mongodb");
exports.createCompanyCard = (req, res) => {
    const params = req.body;
    const company = req.company;
    if (company.stripeId) {
        return addCardToCompany(req, res);
    }
    stripe_1.createCustomer(company.info.companyEmail, 'company ' + company.info.companyName, params.token, (status, customer) => {
        if (status == 1) {
            company.updateOne({ stripeId: customer.id })
                .exec((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                // adding card
                const card = new CompanyCard_1.CompanyCard({
                    ending: params.ending,
                    token: params.token,
                    company: req.companyId
                });
                card.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    stripe_1.addCustomerSource(customer.id, params.token, (status, source, message) => {
                        if (status == 1) {
                            card.updateOne({
                                cardStripeId: source.id,
                                expiryMonth: source.exp_month,
                                expiryYear: source.exp_year,
                                cardType: source.brand,
                                name: source.name
                            }).exec((err, raw) => {
                                if (err) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                }
                                return res.json({ status: constants_1.Status.Success, message: "Company card added successfully." });
                            });
                        }
                        else {
                            return res.json({ status: constants_1.Status.Error, message: message });
                        }
                    });
                });
            });
        }
        else {
            return res.json({ status: constants_1.Status.Error, message: status });
        }
    });
    // const card = new CompanyCard({
    //     ending: params.ending,
    //     token: params.token,
    //     company: req.companyId
    // })
    // card.save((err: any) => {
    //     if (err) {
    //         return res.json({'status': Status.Error, 'message': Messages.GenericError})
    //     }
    //     createCustomer(company.auth.email, 'company '+ company.profile.displayName, params.token, (status: any, customer: any)=>{
    //         if(status == 1){
    //             company.updateOne({stripeId: customer.id})
    //             .exec((err: any)=>{
    //                 if (err) {
    //                     return res.json({'status': Status.Error, 'message': Messages.GenericError})
    //                 }
    //                 // after customer add card
    //                 card.updateOne({
    //                     cardStripeId: customer.sources.data[0].id
    //                 }).exec((err: any, raw: any)=>{
    //                     if (err) {
    //                         return res.json({'status': Status.Error, 'message': Messages.GenericError})
    //                     }
    //                     return res.json({status: Status.Success, message: "Company card added successfully."});
    //                 })
    //             })
    //         } else {
    //             return res.json({status: Status.Error, message: status})
    //         }
    //     })
    // })
};
const addCardToCompany = (req, res) => {
    const params = req.body;
    const company = req.company;
    const card = new CompanyCard_1.CompanyCard({
        ending: params.ending,
        token: params.token,
        company: req.companyId
    });
    card.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        stripe_1.addCustomerSource(company.stripeId, params.token, (status, source, message) => {
            if (status == 1) {
                card.updateOne({
                    cardStripeId: source.id,
                    expiryMonth: source.exp_month,
                    expiryYear: source.exp_year,
                    cardType: source.brand,
                    name: source.name
                }).exec((err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ status: constants_1.Status.Success, message: "Company card added successfully." });
                });
            }
            else {
                return res.json({ status: constants_1.Status.Error, message: message });
            }
        });
    });
};
exports.removeCompanyCard = (req, res) => {
    const params = req.body;
    const company = req.company;
    CompanyCard_1.CompanyCard.findOne({ company: req.companyId, _id: params.cardId }, (err, card) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (card == undefined || card == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "No Card found" });
        }
        if (card.cardStripeId == undefined) {
            CompanyCard_1.CompanyCard.findByIdAndDelete(card._id)
                .exec((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Company card removed successfully.' });
            });
        }
        else {
            stripe_1.detachCustomerSource(company.stripeId, card.cardStripeId, (status) => {
                if (status == 0) {
                    CompanyCard_1.CompanyCard.findByIdAndDelete(card._id)
                        .exec((err) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Company card removed successfully.' });
                    });
                }
                else {
                    return res.json({ status: constants_1.Status.Error, message: status });
                }
            });
        }
    });
};
exports.getCompanyCards = (req, res) => {
    CompanyCard_1.CompanyCard.find({ company: new mongodb_1.ObjectId(req.companyId) }, '_id ending expiryMonth expiryYear name cardType', (err, cards) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'cards': cards });
    });
};
//# sourceMappingURL=companyCard.js.map