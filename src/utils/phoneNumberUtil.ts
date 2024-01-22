const {PhoneNumberFormat, PhoneNumberUtil} = require('google-libphonenumber');

export const standarizePhoneNumberE164 = (phoneNumber: string): string => {
    if(!phoneNumber) {
        return '';
    }
    const phoneUtil = new PhoneNumberUtil();
    try {
        const standarizedPhone = phoneUtil.format(phoneUtil.parse(phoneNumber), PhoneNumberFormat.E164);
        return standarizedPhone;
    }
    catch (e) {
        // If fails to standarize, try again with US country code
        const standarizedPhone = phoneUtil.format(phoneUtil.parse('+1 ' + phoneNumber), PhoneNumberFormat.E164);
        return standarizedPhone;
    }
};