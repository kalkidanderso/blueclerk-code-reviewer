"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const aws_1 = require("../services/aws");
exports.uploadImage = (req, res) => {
    aws_1.uploadImageInS3(req, res, (err, imageUrl) => {
        if (err || !imageUrl) {
            return res.json({ 'status': constants_1.Status.Error, 'message': constants_1.Messages.GenericError });
        }
        return res.json({ 'status': constants_1.Status.Success, 'imageUrl': imageUrl });
    });
};
//# sourceMappingURL=image.js.map