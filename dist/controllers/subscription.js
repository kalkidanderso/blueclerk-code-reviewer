"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const stripe_1 = require("../services/stripe");
const Company_1 = require("../models/Company");
exports.addCompanySubscriptions = (req, res) => {
    const company = req.company;
    const params = req.body;
    if (company.stripeId == undefined || company.stripeId == '') {
        return res.json({ status: constants_1.Status.Error, message: "Company payment method required." });
    }
    const now = new Date();
    const daysRemaining = now.getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysToCharge = daysInCurrentMonth - daysRemaining + 1;
    var amount = 0;
    if (params.noOfOfficeAdmins > 0) {
        const perday = 30 / daysInCurrentMonth;
        amount = amount + (params.noOfOfficeAdmins * (perday * daysToCharge));
    }
    if (params.noOfTechnicians > 0) {
        const perday = 50 / daysInCurrentMonth;
        amount = amount + (params.noOfTechnicians * (perday * daysToCharge));
    }
    if (params.noOfManagers > 0) {
        const perday = 50 / daysInCurrentMonth;
        amount = amount + (params.noOfManagers * (perday * daysToCharge));
    }
    if (amount == 0) {
        return res.json({ 'status': constants_1.Status.Error, 'message': "Invalid no of subscriptions." });
    }
    stripe_1.chargeSubscription(amount, company.stripeId, (status, charge, message) => {
        if (status == 1) {
            const noOfTechs = company.maxTechnicians + parseInt(params.noOfTechnicians);
            const noOfManagers = company.maxManagers + parseInt(params.noOfManagers);
            const noOfOfficeAdmins = company.maxOfficeAdmins + parseInt(params.noOfOfficeAdmins);
            company.updateOne({ maxTechnicians: noOfTechs, maxManagers: noOfManagers, maxOfficeAdmins: noOfOfficeAdmins })
                .exec((err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Company subscriptions added successfull.' });
            });
        }
        else {
            return res.json({ status: constants_1.Status.Error, message: message });
        }
    });
};
exports.removeCompanySubscriptions = (req, res) => {
    const company = req.company;
    const params = req.body;
    if (company.stripeId == undefined || company.stripeId == '') {
        return res.json({ status: constants_1.Status.Error, message: "Company payment method required." });
    }
    if (parseInt(params.noOfTechnicians) > company.maxTechnicians || parseInt(params.noOfManagers) > company.maxManagers || parseInt(params.noOfOfficeAdmins) > company.maxOfficeAdmins) {
        return res.json({ status: constants_1.Status.Error, message: "Invalid no of subscriptions to cancel." });
    }
    const noOfTechs = company.maxTechnicians - parseInt(params.noOfTechnicians);
    const noOfManagers = company.maxManagers - parseInt(params.noOfManagers);
    const noOfOfficeAdmins = company.maxOfficeAdmins - parseInt(params.noOfOfficeAdmins);
    company.updateOne({ maxTechnicians: noOfTechs, maxManagers: noOfManagers, maxOfficeAdmins: noOfOfficeAdmins })
        .exec((err, raw) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Error, 'message': 'Company subscriptions deleted successfull.' });
    });
};
exports.chargeCompanySubscription = (req, res) => {
    Company_1.Company.find({ $or: [{ maxManagers: { $gt: 0 } }, { maxOfficeAdmins: { $gt: 0 } }, { maxTechnicians: { $gt: 0 } }] }, (err, companies) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        const companiesToCharge = companies.length;
        let companiesCharged = 0;
        for (let index = 0; index < companies.length; index++) {
            const company = companies[index];
            var amount = 0;
            if (company.maxOfficeAdmins > 0) {
                amount = amount + (company.maxOfficeAdmins * 30);
            }
            if (company.maxManagers > 0) {
                amount = amount + (company.maxManagers * 50);
            }
            if (company.maxTechnicians > 0) {
                amount = amount + (company.maxTechnicians * 50);
            }
            if (amount > 0) {
                stripe_1.chargeSubscription(amount, company.stripeId, (status, charge, message) => {
                    if (status == 1) {
                        companiesCharged++;
                        if (companiesToCharge == companiesCharged) {
                            return res.json({ 'status': constants_1.Status.Success, 'message': 'Done.' });
                        }
                    }
                    else {
                        console.log("Unable to charge" + company._id + "\n");
                    }
                });
            }
        }
    });
};
//# sourceMappingURL=subscription.js.map