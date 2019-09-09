"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const CustomerEquipment_1 = require("../models/CustomerEquipment");
const Customer_1 = require("../models/Customer");
exports.createCustomerEquipment = (req, res) => {
    const params = req.body;
    const equipment = new CustomerEquipment_1.CustomerEquipment({
        info: {
            model: params.model,
            serialNumber: params.serialNumber,
            nfcTag: params.nfcTag,
            imageUrl: params.imageUrl,
        },
        type: params.equipmentTypeId,
        brand: params.equipmentBrandId,
        customer: params.customerId,
    });
    equipment.save((err) => {
        if (err) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        Customer_1.Customer.findOne({ '_id': params.customerId }, (err, customer) => {
            if (err || !customer) {
                return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
            }
            customer.equipments.push(equipment._id);
            customer.update({ equipments: customer.equipments }, (err, raw) => {
                if (err) {
                    return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
                }
                return res.json({ 'status': constants_1.Status.Success, 'message': 'Customer equipment created successfully.' });
            });
        });
    });
};
exports.getCustomerEquipments = (req, res) => {
    const params = req.body;
    Customer_1.Customer.findOne({ _id: params.customerId })
        .populate({
        path: 'equipments',
    })
        .exec((err, customer) => {
        if (err || !customer) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        res.json({ 'status': constants_1.Status.Success, 'equipments': customer.equipments });
    });
};
//# sourceMappingURL=customerEquipment.js.map