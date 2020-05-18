"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
const mongodb_1 = require("mongodb");
const Contract_1 = require("../models/Contract");
const CompanyPrefix_1 = require("../models/CompanyPrefix");
const InvoicePrefix_1 = require("../models/InvoicePrefix");
const SaleTax_1 = require("../models/SaleTax");
const JobCharges_1 = require("../models/JobCharges");
const Invoice_1 = require("../models/Invoice");
const Job_1 = require("../models/Job");
const Scan_1 = require("../models/Scan");
exports.updateCompanyProfile = (req, res) => {
    const params = req.body;
    Company_1.Company.findById(req.companyId, function (err, company) {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company.info.companyEmail != params.companyEmail) {
            Company_1.Company.findOne({ 'info.companyEmail': params.companyEmail }, (err, previousCompany) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                if (previousCompany) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.CompanyDuplicateEmail });
                }
                company.updateOne({
                    'info.companyName': params.companyName,
                    'info.companyEmail': params.companyEmail,
                    'info.logoUrl': params.logoUrl,
                    'address.street': params.street,
                    'address.city': params.city,
                    'address.state': params.state,
                    'address.zipCode': params.zipCode,
                    'contact.phone': params.phone,
                    'contact.fax': params.fax,
                }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': 'Profile updated successfully.' });
                });
            });
        }
        else {
            company.updateOne({
                'info.companyName': params.companyName,
                'info.logoUrl': params.logoUrl,
                'address.street': params.street,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.phone': params.phone,
                'contact.fax': params.fax,
            }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Profile updated successfully.' });
            });
        }
    });
};
exports.getAllEmployees = (req, res) => {
    Company_1.Company.findOne({ _id: req.companyId })
        .populate({
        path: 'employees',
        select: '_id profile.displayName',
    })
        .populate({
        path: 'admin',
        select: '_id profile.displayName',
    })
        .exec((err, company) => {
        if (err || !company) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        const employees = company.employees;
        company.employees = undefined;
        company.userPermissions = undefined;
        company.stripeId = undefined;
        company.employees = undefined;
        company.customers = undefined;
        company.maxTechnicians = undefined;
        company.maxManagers = undefined;
        company.maxOfficeAdmins = undefined;
        company.other = undefined;
        company.paid = undefined;
        company.type = undefined;
        company.currentJobId = undefined;
        company.chargeDate = undefined;
        company.contact = undefined;
        company.address = undefined;
        res.json({ 'status': constants_1.Status.Success, 'employees': employees, 'company': company });
    });
};
exports.getEmployeesForJob = (req, res) => {
    Employee_1.Employee.find({ $and: [{ company: new mongodb_1.ObjectId(req.companyId) }, { 'permissions.role': { $ne: 0 } }] }, 'id profile.displayName', (err, employees) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'employees': employees });
    });
};
exports.getContractorForJob = (req, res) => {
    var companyId = req.companyId;
    var company = req.company;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Contract_1.Contract.find({ company: company._id })
        .populate({
        path: 'contractor',
        select: '_id info.companyName info.companyEmail type',
    })
        .exec((err, contracts) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        const contractors = contracts.map((contract) => {
            return contract.contractor;
        });
        return res.json({ 'status': constants_1.Status.Success, 'contractors': contractors });
    });
};
exports.getCompanyContracts = (req, res) => {
    const company = req.company;
    Contract_1.Contract.find({ company: company._id })
        .populate({
        path: 'company',
        select: 'info.companyName info.companyEmail type'
    })
        .populate({
        path: 'contractor',
        select: 'info.companyName info.companyEmail type'
    })
        .exec((err, contracts) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (contracts.length == 0 || contracts == undefined) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No contracts found.' });
        }
        res.json({ 'status': constants_1.Status.Success, 'contracts': contracts });
    });
};
exports.getCustomWorkNumber = (req, res) => {
    const params = req.body;
    const admin = req.user;
    Company_1.Company.findById(req.companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company == undefined || company == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        return res.json({ status: constants_1.Status.Success, 'prefix': company.prefix, 'currentWorkOrderNumber': company.currentJobId });
    });
};
exports.getSyncInfo = (req, res) => {
    Company_1.Company.findById(req.companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company == undefined || company == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        return res.json({ 'status': constants_1.Status.Success, 'customersSyncedAt': company.customersSyncedAt, 'customersSynced': company.customersSynced, 'qbAuthorized': company.qbAuthorized });
    });
};
exports.downgradeCompanies = (req, res) => {
    Company_1.Company.find({ $and: [{ chargeDate: { $lte: new Date() } }, { paid: false }, { type: 0 }] }, (err, companies) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (companies.length > 0) {
            const companiesToDowngrade = companies.length;
            let companiesDowngraded = 0;
            for (let index = 0; index < companies.length; index++) {
                const company = companies[index];
                company.updateOne({ type: 1 }, (err, raw) => {
                    if (err) {
                        console.log("Unable to downgrade" + company._id + "\n");
                    }
                    aws_1.sendAccountDowngradeEmail({ to: company.info.companyEmail });
                    companiesDowngraded++;
                    if (companiesToDowngrade == companiesDowngraded) {
                        return res.json({ 'status': constants_1.Status.Success, 'message': 'Downgrading done.' });
                    }
                });
            }
        }
        else {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Nothing to downgrade.' });
        }
    });
};
exports.setCustomWorkNumber = (req, res) => {
    const params = req.body;
    const admin = req.user;
    var oldPrefix;
    var oldJobId;
    if ((params.prefix == undefined || params.prefix === null || params.prefix === '""') && (params.workOrderNumber == undefined || params.workOrderNumber === null || params.workOrderNumber === '""')) {
        return res.json({ 'status': constants_1.Status.Error, 'message': "Either prefix or work order number is required." });
    }
    Company_1.Company.findById(admin.company, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company == undefined || company == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        if (typeof params.prefix !== 'undefined' && params.prefix && (typeof params.workOrderNumber === 'undefined' && !params.workOrderNumber)) {
            if (params.prefix == company.prefix) {
                return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix already set there." });
            }
            checkPrefixExists(req, res, (req, res, previousPrefix) => {
                oldPrefix = company.prefix;
                company.updateOne({ 'prefix': params.prefix }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    if (previousPrefix == null && oldPrefix != undefined) {
                        var prefix = new CompanyPrefix_1.CompanyPrefix({
                            company: req.companyId,
                            prefix: oldPrefix,
                            maxJobId: company.currentJobId
                        });
                        prefix.save((err, companyPrefix) => {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                        });
                    }
                    else if (previousPrefix != null) {
                        previousPrefix.updateOne({ 'prefix': oldPrefix, 'maxJobId': company.currentJobId }, (err, raw) => {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                        });
                    }
                    else {
                        return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                    }
                });
            });
        }
        else if (typeof params.workOrderNumber !== 'undefined' && params.workOrderNumber && (typeof params.prefix === 'undefined' || !params.prefix)) {
            if (company.currentJobId > params.workOrderNumber) {
                return res.json({ 'status': constants_1.Status.Success, 'message': "Work order number can not be less then " + company.currentJobId });
            }
            company.updateOne({ 'currentJobId': params.workOrderNumber }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': "Work order number updated successfully." });
            });
        }
        else if ((typeof params.prefix !== 'undefined' && params.prefix) && (typeof params.workOrderNumber !== 'undefined' && params.workOrderNumber)) {
            if (company.prefix == params.prefix) {
                if (company.currentJobId > params.workOrderNumber) {
                    return res.json({ 'status': constants_1.Status.Success, 'message': "Work order number can not be less then " + company.currentJobId });
                }
                company.updateOne({ 'currentJobId': params.workOrderNumber }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': "Work order number updated successfully." });
                });
            }
            else if (company.prefix != params.prefix) {
                checkPrefixExists(req, res, (req, res) => {
                    oldPrefix = company.prefix;
                    oldJobId = company.currentJobId;
                    company.updateOne({ 'prefix': params.prefix, 'currentJobId': params.workOrderNumber }, (err, raw) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        if (prefix == null && oldPrefix != undefined) {
                            var prefix = new CompanyPrefix_1.CompanyPrefix({
                                company: req.companyId,
                                prefix: oldPrefix,
                                maxJobId: oldJobId
                            });
                            prefix.save((err, companyPrefix) => {
                                if (err) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                }
                                return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                            });
                        }
                        else if (prefix != null) {
                            const companyPrefix = prefix;
                            companyPrefix.updateOne({ 'prefix': oldPrefix, 'maxJobId': oldJobId }, (err, raw) => {
                                if (err) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                }
                                return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                            });
                        }
                        else {
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                        }
                    });
                });
            }
        }
    });
};
const checkPrefixExists = (req, res, next) => {
    const params = req.body;
    CompanyPrefix_1.CompanyPrefix.findOne({ 'prefix': req.company.prefix, 'company': req.companyId }, (err, companyPrefix) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (companyPrefix == undefined || companyPrefix == null) {
            next(req, res, null);
            return;
        }
        else {
            if (params.workOrderNumber != undefined && params.workOrderNumber !== null && params.workOrderNumber != '""') {
                if (companyPrefix.maxJobId > params.workOrderNumber) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'Work order number with prefix ' + params.prefix + ' is not allowed. Try no greater then ' + companyPrefix.maxJobId });
                }
                else {
                    next(req, res, companyPrefix);
                    return;
                }
            }
            else if (companyPrefix.maxJobId > req.company.currentJobId) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Current work order number with prefix ' + params.prefix + ' is not allowed. Try no greater then ' + companyPrefix.maxJobId });
            }
            else {
                next(req, res, companyPrefix);
                return;
            }
        }
    });
};
exports.setCustomInvoiceNumber = (req, res) => {
    const params = req.body;
    const admin = req.user;
    var oldInvoicePrefix;
    var oldInvoiceId;
    if ((params.invoicePrefix == undefined || params.invoicePrefix === null || params.invoicePrefix === '""') && (params.invoiceNumber == undefined || params.invoiceNumber === null || params.invoiceNumber === '""')) {
        return res.json({ 'status': constants_1.Status.Error, 'message': "Either prefix or work order number is required." });
    }
    Company_1.Company.findById(admin.company, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company == undefined || company == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        if (typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix && (typeof params.invoiceNumber === 'undefined' && !params.invoiceNumber)) {
            if (params.invoicePrefix == company.invoicePrefix) {
                return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice Prefix already set there." });
            }
            checkInvoicePrefixExists(req, res, (req, res, previousPrefix) => {
                oldInvoicePrefix = company.invoicePrefix;
                company.updateOne({ 'invoicePrefix': params.invoicePrefix }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    if (previousPrefix == null && oldInvoicePrefix != undefined) {
                        var prefix = new InvoicePrefix_1.InvoicePrefix({
                            company: req.companyId,
                            prefix: oldInvoicePrefix,
                            maxInvoiceId: company.currentInvoiceId
                        });
                        prefix.save((err, invoicePrefix) => {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                        });
                    }
                    else if (previousPrefix != null) {
                        previousPrefix.updateOne({ 'prefix': oldInvoicePrefix, 'maxInvoiceId': company.currentInvoiceId }, (err, raw) => {
                            if (err) {
                                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                            }
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                        });
                    }
                    else {
                        return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                    }
                });
            });
        }
        else if (typeof params.invoiceNumber !== 'undefined' && params.invoiceNumber && (typeof params.invoicePrefix === 'undefined' || !params.invoicePrefix)) {
            if (company.currentInvoiceId > params.invoiceNumber) {
                return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice number can not be less then " + company.currentJobId });
            }
            company.updateOne({ 'currentInvoiceId': params.invoiceNumber }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice number updated successfully." });
            });
        }
        else if ((typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix) && (typeof params.invoiceNumber !== 'undefined' && params.invoiceNumber)) {
            if (company.invoicePrefix == params.invoicePrefix) {
                if (company.currentJobId > params.invoiceNumber) {
                    return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice number can not be less then " + company.currentJobId });
                }
                company.updateOne({ 'currentInvoiceId': params.invoiceNumber }, (err, raw) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice number updated successfully." });
                });
            }
            else if (company.prefix != params.invoicePrefix) {
                checkInvoicePrefixExists(req, res, (req, res) => {
                    oldInvoicePrefix = company.prefix;
                    oldInvoiceId = company.currentJobId;
                    company.updateOne({ 'invoicePrefix': params.invoicePrefix, 'currentInvoiceId': params.invoiceNumber }, (err, raw) => {
                        if (err) {
                            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                        }
                        if (prefix == null && oldInvoicePrefix != undefined) {
                            var prefix = new InvoicePrefix_1.InvoicePrefix({
                                company: req.companyId,
                                prefix: oldInvoicePrefix,
                                maxInvoiceId: oldInvoiceId
                            });
                            prefix.save((err, invoicePrefix) => {
                                if (err) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                }
                                return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                            });
                        }
                        else if (prefix != null) {
                            const invoicePrefix = prefix;
                            invoicePrefix.updateOne({ 'prefix': oldInvoicePrefix, 'maxInvoiceId': oldInvoiceId }, (err, raw) => {
                                if (err) {
                                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                                }
                                return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                            });
                        }
                        else {
                            return res.json({ 'status': constants_1.Status.Success, 'message': "Prefix updated successfully." });
                        }
                    });
                });
            }
        }
    });
};
const checkInvoicePrefixExists = (req, res, next) => {
    const params = req.body;
    InvoicePrefix_1.InvoicePrefix.findOne({ 'prefix': req.company.prefix, 'company': req.companyId }, (err, invoicePrefix) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (invoicePrefix == undefined || invoicePrefix == null) {
            next(req, res, null);
            return;
        }
        else {
            if (params.invoiceNumber != undefined && params.invoiceNumber !== null && params.invoiceNumber != '""') {
                if (invoicePrefix.maxInvoiceId > params.invoiceNumber) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': 'Invoice number with prefix ' + params.invoicePrefix + ' is not allowed. Try no greater then ' + invoicePrefix.maxInvoiceId });
                }
                else {
                    next(req, res, invoicePrefix);
                    return;
                }
            }
            else if (invoicePrefix.maxInvoiceId > req.company.currentJobId) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Current invoice number with prefix ' + params.invoicePrefix + ' is not allowed. Try no greater then ' + invoicePrefix.maxInvoiceId });
            }
            else {
                next(req, res, invoicePrefix);
                return;
            }
        }
    });
};
exports.createSalesTax = (req, res) => {
    const params = req.body;
    const user = req.user;
    SaleTax_1.SaleTax.findOne({ 'state': params.state, 'company': req.companyId }, (err, saleTax) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (saleTax != undefined || saleTax != null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Sales tax already added." });
        }
        var sale = new SaleTax_1.SaleTax({
            state: params.state,
            tax: params.tax,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        });
        sale.save((err, tax) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Sale tax created successfully." });
        });
    });
};
exports.updateSalesTax = (req, res) => {
    const params = req.body;
    SaleTax_1.SaleTax.findOne({ '_id': params.salesTaxId, 'company': req.companyId }, (err, saleTax) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (saleTax == undefined || saleTax == null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invalid sale tax id." });
        }
        saleTax.updateOne({ state: params.state, tax: params.tax }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Sale tax updated successfully." });
        });
    });
};
exports.deleteSalesTax = (req, res) => {
    const params = req.body;
    SaleTax_1.SaleTax.findOne({ '_id': params.salesTaxId, 'company': req.companyId }, (err, saleTax) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (saleTax == undefined || saleTax == null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invalid sale tax id." });
        }
        SaleTax_1.SaleTax.deleteOne({ _id: saleTax._id })
            .exec((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Sale tax deleted successfully." });
        });
    });
};
exports.getSalesTaxes = (req, res) => {
    SaleTax_1.SaleTax.find({ 'company': req.companyId }, (err, saleTaxes) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'taxes': saleTaxes });
    });
};
// Job Charges
exports.createJobCharges = (req, res) => {
    const params = req.body;
    const user = req.user;
    JobCharges_1.JobCharges.findOne({ 'jobType': params.jobTypeId, 'company': req.companyId }, (err, jobCharges) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (jobCharges != undefined || jobCharges != null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Job charge already added." });
        }
        var charges = new JobCharges_1.JobCharges({
            jobType: params.jobTypeId,
            charges: params.charges,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now(),
            isFixed: params.isFixed
        });
        charges.save((err, charge) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Job charges created successfully." });
        });
    });
};
exports.updateJobCharges = (req, res) => {
    const params = req.body;
    JobCharges_1.JobCharges.findOne({ '_id': params.jobChargesId, 'company': req.companyId }, (err, jobCharges) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (jobCharges == undefined || jobCharges == null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invalid job Charge id." });
        }
        jobCharges.updateOne({
            charges: params.charges,
            isFixed: params.isFixed
        }, (err, raw) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Job charges updated successfully." });
        });
    });
};
exports.deleteJobCharges = (req, res) => {
    const params = req.body;
    JobCharges_1.JobCharges.findOne({ '_id': params.jobChargesId, 'company': req.companyId }, (err, jobCharges) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (jobCharges == undefined || jobCharges == null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invalid job Charge id." });
        }
        JobCharges_1.JobCharges.deleteOne({ _id: jobCharges._id })
            .exec((err) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': "Job charge deleted successfully." });
        });
    });
};
exports.getJobCharges = (req, res) => {
    JobCharges_1.JobCharges.find({ 'company': req.companyId })
        .populate({
        path: 'jobType',
        select: 'title',
    })
        .exec((err, jobCharges) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'jobCharges': jobCharges });
    });
};
exports.getInvoiceNumber = (req, res) => {
    Company_1.Company.findById(req.companyId, (err, company) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (company == undefined || company == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'No company found.' });
        }
        return res.json({ status: constants_1.Status.Success, 'invoicePrefix': company.invoicePrefix, 'currentInvoiceNumber': company.currentInvoiceId });
    });
};
// Invoices
exports.createInvoice = (req, res) => {
    const params = req.body;
    const user = req.user;
    const company = req.company;
    Invoice_1.Invoice.findOne({ 'job': params.jobId, 'company': req.companyId }, (err, previousInvoice) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (previousInvoice != undefined || previousInvoice != null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice already created for this job." });
        }
        Job_1.Job.findById(params.jobId, (jobError, job) => {
            if (jobError) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if (job == undefined || job == null) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid job id' });
            }
            let taxAmount = 0;
            let charges = job.charges;
            if (params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) {
                taxAmount = job.charges * params.tax / 100;
            }
            let total = job.charges + taxAmount;
            let currentInvoiceId = 0;
            if (company.currentInvoiceId) {
                currentInvoiceId = company.currentInvoiceId;
            }
            let invoiceId = 'Invoice ' + (currentInvoiceId + 1);
            if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
                invoiceId = 'Invoice ' + company.invoicePrefix + '-' + (currentInvoiceId + 1);
            }
            if (params.charges != undefined && params.charges !== null && params.charges !== '""') {
                charges = params.charges;
                taxAmount = params.charges * params.tax / 100;
                total = params.charges + taxAmount;
            }
            var invoice = new Invoice_1.Invoice({
                invoiceId: invoiceId,
                job: params.jobId,
                customer: job.customer,
                company: req.companyId,
                charges: charges,
                total: total,
                tax: taxAmount,
                taxPercentage: params.tax,
                createdBy: user._id,
                createdAt: Date.now()
            });
            invoice.save((invoiceError, newInvoice) => {
                if (invoiceError) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                    .exec((companyError, raw) => {
                    if (companyError) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                    return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice created successfully." });
                });
            });
        });
    });
};
exports.updateInvoice = (req, res) => {
    const params = req.body;
    Invoice_1.Invoice.findOne({ '_id': params.invoiceId, 'company': req.companyId }, (err, invoice) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (invoice == undefined || invoice == null) {
            return res.json({ 'status': constants_1.Status.Success, 'message': "Invalid invoice id." });
        }
        Job_1.Job.findById(invoice.job, (err, job) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            if ((params.charges == undefined || params.charges == null || params.charges == '""') && (params.tax == undefined || params.tax == null || params.tax == '""')) {
                return res.json({ 'status': constants_1.Status.Error, 'message': 'Tax Percentage or charges are required' });
            }
            let tax = invoice.tax;
            let taxPercentage = invoice.taxPercentage;
            let charges = invoice.charges;
            let total = invoice.total;
            if ((params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) &&
                (params.charges == undefined || params.charges == null || params.charges == '""')) {
                taxPercentage = params.tax;
                tax = (charges * params.tax) / 100;
                total = charges + tax;
            }
            else if ((params.charges != undefined && params.charges !== null && params.charges !== '""') &&
                (params.tax == undefined || params.tax == null || params.tax == '""')) {
                tax = (params.charges * taxPercentage) / 100;
                charges = params.charges;
                total = charges + tax;
            }
            else {
                // update tax and charges
                charges = params.charges;
                taxPercentage = params.tax;
                tax = (params.charges * params.tax) / 100;
                total = charges + tax;
            }
            invoice.updateOne({ tax: tax, taxPercentage: taxPercentage, charges: charges, total: total }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': "Invoice updated successfully." });
            });
        });
    });
};
exports.getInvoiceDetail = (req, res) => {
    const params = req.body;
    Invoice_1.Invoice.findOne({ _id: params.invoiceId, 'company': req.companyId })
        .populate({
        path: 'job',
        populate: [{ path: 'type', select: 'title' }, { path: 'ticket', select: 'ticketId note scheduleDateTime' }, { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' }],
    })
        .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .populate({
        path: 'createdBy',
        select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .exec((err, invoice) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        if (invoice == undefined || invoice == null) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Invalid invoice id' });
        }
        Scan_1.Scan.find({ job: invoice.job }, 'comment timeOfScan')
            .populate({
            path: 'equipment',
            select: 'info.model info.serialNumber info.nfcTag images info.location',
            populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],
        })
            .exec((err, scans) => {
            if (err) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'invoice': invoice, 'scans': scans });
        });
    });
};
exports.getInvoices = (req, res) => {
    Invoice_1.Invoice.find({ 'company': req.companyId })
        .populate({
        path: 'job',
        populate: [{ path: 'type', select: 'title' }, { path: 'customer', select: 'info.email auth.email profile.displayName' }, { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' }],
    })
        .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl info.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
        .exec((err, invoices) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'invoices': invoices });
    });
};
//# sourceMappingURL=company.js.map