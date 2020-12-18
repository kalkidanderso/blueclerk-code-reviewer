"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Customer_1 = require("../models/Customer");
const CompanyCustomer_1 = require("../models/CompanyCustomer");
const multer_1 = __importDefault(require("multer"));
var fs = require('fs');
var XLSX = require('xlsx');
exports.uploadfile = (req, res) => {
    var companyId = req.companyId;
    const path = __dirname + '/../uploads/';
    const time = Date.now();
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    var storage = multer_1.default.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path);
        },
        filename: function (req, file, cb) {
            cb(null, time + file.originalname);
        }
    });
    var upload = multer_1.default({ storage: storage });
    const uploadSingle = upload.single('customerSheet');
    uploadSingle(req, res, (err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': "No file available" });
        }
        const fileName = time + req.file.originalname;
        if (fileName.split('.').pop() != "xlsx") {
            fs.unlinkSync(path + fileName);
            return res.json({ 'status': constants_1.Status.Error, 'message': "File must be of type xlsx" });
        }
        let columnHeaders = [];
        var workbook = XLSX.readFile(path + fileName);
        var sheet_name_list = workbook.SheetNames;
        var worksheet = workbook.Sheets[sheet_name_list[0]];
        for (let key in worksheet) {
            let regEx = new RegExp("^\(\\w\)\(1\){1}$");
            if (regEx.test(key) == true) {
                columnHeaders.push(worksheet[key].v);
            }
        }
        var defaultColumnHeads = ['email', 'name', 'street', 'city', 'state', 'zipCode', 'phone', 'contactName', 'latitude', 'longitude'];
        if (!columnsEqual(defaultColumnHeads, columnHeaders)) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Sheet must contain following columns email, name, street, city, state, zipCode, phone, contactName, latitude, longitude' });
        }
        var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
        var customers = [];
        xlData.map((obj) => {
            var customer = [];
            customer = new Customer_1.Customer({
                info: {
                    email: obj.email,
                },
                profile: {
                    firstName: obj.name,
                    lastName: obj.name,
                    displayName: obj.name,
                    imageUrl: '',
                },
                address: {
                    street: obj.street,
                    city: obj.city,
                    state: obj.state,
                    zipCode: obj.zipCode,
                },
                contact: {
                    phone: obj.phone,
                },
                company: req.companyId,
                permissions: {
                    role: 5 /* CUSTOMER */,
                    extra: [],
                }
            });
            customers.push(customer);
        });
        fs.unlinkSync(path + fileName);
        customers.map((customer) => {
            customer.save((err) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError, 'error': err });
                }
                // create company customer here
                const companyCustomer = new CompanyCustomer_1.CompanyCustomer({
                    company: companyId,
                    customer: customer._id,
                    createdAt: Date.now()
                });
                companyCustomer.save((err) => {
                    if (err) {
                        return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                    }
                });
            });
        });
        return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer created successfully.' });
    });
};
function columnsEqual(_arr1, _arr2) {
    if (!Array.isArray(_arr1) || !Array.isArray(_arr2) || _arr1.length !== _arr2.length)
        return false;
    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i])
            return false;
    }
    return true;
}
//# sourceMappingURL=customerImport.js.map