const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const saltRounds = 12;

const subscriberSchema = new mongoose.Schema({
    
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    email: { type: String, required: true, unique: true},
    password: {type: String, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    role: {type: String, default: "Global Admin"},
    companyName: {type: String},
    industry: {type: String, default: "General"},
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    }
    
}, { timestamps: true });

subscriberSchema.pre('save', async function(next) {
    const sub = this;
    if(!sub.isModified('password')) return next();
    try {
        const hash = await bcrypt.hash(sub.password, saltRounds);
        sub.password = hash;
        return next();
    } catch (err) {
        return next(err);
    }
});

subscriberSchema.methods.comparePassword = async function(subPass){
    return bcrypt.compare(subPass, this.password);
}

subscriberSchema.methods.getJWT = function() {
    let expiration_time = parseInt(process.env.jwt_expiration);
    let subClaim = {
        iss: "http://api.blueclerk.com/v1",
        subscriber_id: this.id,
        email: this.email,
        role: this.role
    };

    return (
        "Bearer " +
        jwt.sign(subClaim, process.env.jwt_encryption, {
            expiresIn: expiration_time
        })
    );
};

module.exports = mongoose.model('Subscriber', subscriberSchema);