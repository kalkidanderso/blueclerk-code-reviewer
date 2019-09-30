import { check } from 'express-validator'

export const Status = {
    Error: 0,
    Success: 1
}

export const Messages = {
    MissingParams: 'Parameters are missing.',
    InvalidEmailPassword: 'Invalid email/password.',
    GenericError: 'Can\'t process now. Please try again later.',
    DuplicateEmail: 'Email address already registered. Please try with some other email address',
    UnAuthorized: 'You are not authorized for this action. Please contact admin for more details.',
}

export const enum Role {
    OFFICE_ADMIN,
    TECHNICIAN, 
    MANAGER, 
    COMPANY, 
    GLOBAL_ADMIN
}

export const enum OrderStatus {
    PLACED,
    PAID, 
    CONFIRMED, 
    DISPATCHED, 
    DELIVERED
}

export const enum EquipmentStatus {
    CHECKIN,
    CHECKOUT
}
