import { check } from 'express-validator'

export const Status = {
    Error: 0,
    Success: 1
}

export const Messages = {
    MissingParams: 'Parameters are missing.',
    InvalidEmailPassword: 'Invalid email/password.',
    GenericError: 'Can\'t process now. Please try again later.',
    DuplicateEmail: 'Email address already register. Please try with some other email address',
}

export const enum Role {
    GLOBAL_ADMIN, 
    SUBSCRIBER, 
    MANAGER, 
    TECHNICIAN, 
    OFFICE_ADMIN
}