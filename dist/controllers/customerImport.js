"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Customer_1 = require("../models/Customer");
var fs = require('fs');
var XLSX = require('xlsx');
exports.uploadfile = (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.json({ 'status': constants_1.Status.Error, 'message': "No file available" });
    }
    let files = req.files;
    const path = __dirname + '/../uploads/';
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    const fileName = Date.now() + files.customerSheet.name;
    if (fileName.split('.').pop() != "xlsx") {
        return res.json({ 'status': constants_1.Status.Error, 'message': "File must be of type xlsx" });
    }
    let columnHeaders = [];
    files.customerSheet.mv(path + fileName, function (err) {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var workbook = XLSX.readFile(path + fileName);
        var sheet_name_list = workbook.SheetNames;
        var worksheet = workbook.Sheets[sheet_name_list[0]];
        for (let key in worksheet) {
            let regEx = new RegExp("^\(\\w\)\(1\){1}$");
            if (regEx.test(key) == true) {
                columnHeaders.push(worksheet[key].v);
            }
        }
        var defaultColumnHeads = ['email', 'name', 'street', 'city', 'state', 'zipCode', 'phone'];
        if (!columnsEqual(defaultColumnHeads, columnHeaders)) {
            return res.json({ 'status': constants_1.Status.Error, 'message': 'Sheet must contain following columns email, name, street, city, state, zipCode, phone' });
        }
        var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
        var customers = [];
        xlData.map((obj) => {
            customers.push(new Customer_1.Customer({
                info: {
                    name: obj.name,
                    email: obj.email,
                },
                address: {
                    street: obj.street,
                    city: obj.city,
                    state: obj.state,
                    zipCode: obj.zipCode,
                },
                contact: {
                    name: obj.name,
                    phone: obj.phone,
                },
                company: req.companyId
            }));
        });
        fs.unlinkSync(path + fileName);
        Customer_1.Customer.collection.insert(customers, function (err, docs) {
            if (err) {
                console.error(err);
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            else {
                console.log("Multiple documents inserted to Collection");
                return res.json({ 'status': constants_1.Status.Success, 'message': "Customers imported successfully" });
            }
        });
        // return res.json({'status': Status.Success, 'message': "Customers imported successfully"})
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