"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const Customer_1 = require("../models/Customer");
const multer_1 = __importDefault(require("multer"));
var fs = require('fs');
var XLSX = require('xlsx');
exports.uploadfile = (req, res) => {
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
    const uploadSingle = upload.single('image');
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
                return res.json({ 'status': constants_1.Status.Success, 'message': "Customers imported successfully" });
            }
        });
    });
};
// export const uploadfile = (req: Request, res: Response) => {
//     if (!req.files || Object.keys(req.files).length === 0) {
//         return res.json({'status': Status.Error, 'message': "No file available"})
//     }
//     let files: any = req.files
//     const path = __dirname+'/../uploads/'
//     if (!fs.existsSync(path)) {
//         fs.mkdirSync(path);
//     }
//     const fileName = Date.now()+files.customerSheet.name
//     if(fileName.split('.').pop() != "xlsx") {
//         return res.json({'status': Status.Error, 'message': "File must be of type xlsx"})
//     }
//     let columnHeaders: any = [];
//     files.customerSheet.mv(path+fileName, function(err: any) {
//         if (err){
//             return res.json({'status': Status.Error, 'message': Messages.GenericError})
//         }
//         var workbook = XLSX.readFile(path+fileName)
//         var sheet_name_list = workbook.SheetNames
//         var worksheet = workbook.Sheets[sheet_name_list[0]]
//         for (let key in worksheet) {
//             let regEx = new RegExp("^\(\\w\)\(1\){1}$");
//             if (regEx.test(key) == true) {
//                 columnHeaders.push(worksheet[key].v);
//             }
//         }
//         var defaultColumnHeads: any = [ 'email', 'name', 'street', 'city', 'state', 'zipCode' , 'phone']
//         if( !columnsEqual(defaultColumnHeads, columnHeaders)){
//             return res.json({'status': Status.Error, 'message': 'Sheet must contain following columns email, name, street, city, state, zipCode, phone'})
//         }
//         var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]])
//         var customers: any = []
//         xlData.map((obj: any)=>{
//             customers.push(new Customer({
//                 info: {
//                     name: obj.name,
//                     email: obj.email,
//                 },
//                 address: {
//                     street: obj.street,
//                     city: obj.city,
//                     state: obj.state,
//                     zipCode: obj.zipCode,
//                 },
//                 contact: {
//                     name: obj.name,
//                     phone: obj.phone,
//                 },
//                 company: req.companyId
//             })) 
//         })
//         fs.unlinkSync(path+fileName)
//         Customer.collection.insert(customers, function (err, docs) {
//             if (err){ 
//                 console.error(err)
//                 return res.json({'status': Status.Error, 'message': Messages.GenericError})
//             } else {
//                 console.log("Multiple documents inserted to Collection")
//                 return res.json({'status': Status.Success, 'message': "Customers imported successfully"})
//             }
//         })
//         // return res.json({'status': Status.Success, 'message': "Customers imported successfully"})
//     })
// }
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