"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CompanyEquipment_1 = require("../models/CompanyEquipment");
const CompanyEquipmentInventory_1 = require("../models/CompanyEquipmentInventory");
exports.createCompanyEquipmentInventory = (req, res) => {
    const params = req.body;
    const user = req.user;
    var nfcTags = params.nfcTags.split(',');
    var qrCodes = params.qrCodes.split(',');
    CompanyEquipment_1.CompanyEquipment.find({ $or: [{ nfcTag: { $in: nfcTags } }, { qrCode: { $in: qrCodes } }] }, '_id', (err, companyEquipments) => {
        if (err) {
            console.log("error1 \n " + err);
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        var ids = companyEquipments.map(function (item) {
            return item['_id'];
        });
        const companyEquipmentInventory = new CompanyEquipmentInventory_1.CompanyEquipmentInventory({
            dateTime: params.dateTime,
            createdBy: user._id,
            noOfItems: ids.length,
            companyEquipments: ids
        });
        companyEquipmentInventory.save((err) => {
            if (err) {
                console.log("error2 \n " + err);
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            return res.json({ 'status': constants_1.Status.Success, 'message': 'Inventory created successfully.' });
        });
    });
};
// export const getIventoryHistory = (req: Request, res: Response) => {
//     const user = <IUser> req.user
//     console.log("user id \n" + user._id);
//     Group.findOne(
//         // {member: user._id},
//         {members: new ObjectId(user._id)},
//         // { members: { 
//         //     $elemMatch: { id: user._id } 
//         //  }},
//         (err: any, group: IGroup)=>{
//             console.log("group \n"+ group);
//             if (err) {
//                 return res.json({'status': Status.Error, 'message': Messages.GenericError})
//             }
//             if (group == null || group == undefined) {
//                 console.log("inside group empty");
//                 return res.json({'status': Status.Success, 'companyEquipmentInventory': []}) 
//             }
//             console.log(group.members);
//             const members = group.members.map((id)=>{
//                 new ObjectId(id.toString())
//                 // console.log(typeof(id));
//             })
//             console.log(members);
//             CompanyEquipmentInventory.find({createdBy : {$in: members}})
//             // .populate({
//             //     path: 'createdBy',
//             //     select: 'profile.displayName',
//             // })
//             .exec((err: any, companyEquipmentInventory: ICompanyEquipmentInventory[]) =>{
//                 console.log(companyEquipmentInventory);
//                 if (err) {
//                     return res.json({'status': Status.Error, 'message': Messages.GenericError})
//                 }
//                 return res.json({'status': Status.Success, 'companyEquipmentInventory': companyEquipmentInventory}) 
//             })
//         })
// }
//# sourceMappingURL=companyEquipmentInventory.js.map