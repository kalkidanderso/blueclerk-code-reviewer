"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_nodejs_1 = __importDefault(require("bcrypt-nodejs"));
const UserSchema = new mongoose_1.Schema({
    auth: {
        email: { type: String },
        password: { type: String },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        socialId: String,
        connectorType: {
            type: Number,
            default: 0
            // 0 for facebook
            // 1 for google
        }
    },
    profile: {
        firstName: String,
        lastName: String,
        displayName: String,
        imageUrl: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        phone: String,
        fax: String,
    },
    permissions: {
        role: Number,
        extra: [String],
    }
});
UserSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = this;
        if (!user.isModified('auth.password')) {
            return next();
        }
        user.hashPassword(user.auth.password, (err, hash) => {
            if (err || !hash)
                return next(err);
            user.auth.password = hash;
            next();
        });
    });
});
UserSchema.methods.hashPassword = function (password, next) {
    const saltRounds = 12;
    try {
        bcrypt_nodejs_1.default.genSalt(saltRounds, (err, salt) => {
            if (err)
                return next(err);
            bcrypt_nodejs_1.default.hash(password, salt, undefined, (err, hash) => {
                if (err)
                    return next(err);
                next(null, hash);
            });
        });
    }
    catch (err) {
        return next(err);
    }
};
UserSchema.methods.comparePassword = function (password, next) {
    const user = this;
    bcrypt_nodejs_1.default.compare(password, user.auth.password, (err, isMatch) => {
        next(isMatch);
    });
};
UserSchema.methods.jwt = function () {
    const user = this;
    const token = jsonwebtoken_1.default.sign({
        iss: "http://api.blueclerk.com",
        id: user._id,
    }, process.env.jwt_encryption, {
        expiresIn: parseInt(process.env.jwt_expiration)
    });
    return `Bearer ${token}`;
};
exports.User = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map