import { AccountTypes, Role } from "../../common/constants";

export interface ILoginInput {
    email: string;
    password: string;
    fbToken?: string;
}

export interface ILoginReturn {
    status: number;
    message?: string;
    token?: string;
    userType: number;
    accountType: number;
    user: any;
    company?: any;
}

export interface IFirebaseToken {
    token: string;
    createdAt: string;
    updatedAt: string;
}

export interface IUser {
    id: number;
    accountType?: AccountTypes
    auth: {
        email: string
        password: string
        resetPasswordToken: string
        resetPasswordExpires: Date
        socialId: string
        connectorType: number
    }
    profile: {
        firstName: string
        lastName: string
        displayName: string
        imageUrl: string
    }
    address: {
        street?: string
        unit?: string
        city?: string
        state?: string
        zipCode?: string
    }
    location: {
        type?: 'Point',
        coordinates: number[]
    },
    contact: {
        phone: string
        fax?: string
    }
    permissions: {
        role: Role,
        extra: [string]
    },
    emailPreferences: {
        preferences: Number,
        time: Date,
        timeZone: String
    },
    balance: number,
    credit: number,
    commission: number,
    firebaseTokens: {
        token: string,
        createdAt: Date,
        updatedAt: Date
    }[],
}

export interface ICompanyAdmin {

    company: any
}

export interface IEmployee {

    company: any
    status: Number,
    extraPermissions: {
        on: [number],
        off: [number]
    },
    agreed: boolean
    canAccessAllLocations: boolean;
}

export interface IUserRegister {
    accountType: string
    email: string
    password: string
    firstName: string
    lastName: string
    phone: string
    companyName?: string
    supplierName?: string
    industryId?: number
    companyId?: number
    customerId?: number
    role?: string
    isci?: boolean
    cid?: number
}