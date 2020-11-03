"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport_jwt_1 = require("passport-jwt");
const User_1 = require("../models/User");
exports.default = (passport) => {
    passport.use(new passport_jwt_1.Strategy({
        jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.jwt_encryption,
    }, (payload, done) => {
        if (!payload.id) {
            return done(null, false);
        }
        User_1.User.findOne({ _id: payload.id }, (err, user) => {
            if (err || !user) {
                return done(err, false);
            }
            done(null, user);
        });
    }));
};
//# sourceMappingURL=passport.js.map