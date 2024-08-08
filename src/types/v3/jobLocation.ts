import { timestamp } from "aws-sdk/clients/cloudfront";

//here we added all interfaces for job location
export interface IJobLocation {
    id?: number;
    customerId?: number;
}
export interface IJobLocationNew {
    id?: number;
    alternativeId: string,
    name: string,
    contacts: {
        name:string,
        phone?:string,
        email?:string
    },
    location:  {coordinates: [string, string]},
    address: {
        street: string
        unit?: string
        city: string
        state: string
        zipCode: string
    },
    jobSites?: number[],
    isActive?: boolean,
    customerId?: number,
    companyId: number,
    inactiveAt?: timestamp | undefined,
    inactiveById?: number | undefined,
    quickbookId?: string,
}
export interface ICreatedJobLocation {
    alternativeId: string,
    name: string,
    contacts: {
        name:string,
        phone?:string,
        email?:string
    },
    location: {
        lat: string,
        long: string
    },
    address: {
        street: string
        unit?: string
        city: string
        state: string
        zipCode: string
    },
    jobSites?: number[],
    isActive?: boolean,
    customerId?: number,
    companyId: number,
    inactiveAt?: timestamp | undefined,
    inactiveById?: number | undefined,
    quickbookId?: string,
}
export interface IUpdateJobLocation {
    alternativeId: string,
    name: string,
    contacts: {
        name:string,
        phone?:string,
        email?:string
    },
    location: {
        lat: string,
        long: string
    },
    address: {
        street: string
        unit?: string
        city: string
        state: string
        zipCode: string
    },
    jobSites?: number[],
    isActive?: boolean,
    customerId?: number,
    companyId: number,
    inactiveAt?: timestamp | undefined,
    inactiveById?: number | undefined,
    quickbookId?: string,
}
export interface IUpdateModelJobLocation {
    id: number,
    alternativeId: string,
    name: string,
    contacts: {
        name:string,
        phone?:string,
        email?:string
    },
    location: {
        lat: string,
        long: string
    },
    address: {
        street: string
        unit?: string
        city: string
        state: string
        zipCode: string
    },
    jobSites?: number[],
    isActive?: boolean,
    customerId?: number,
    companyId: number,
    inactiveAt?: timestamp | undefined,
    inactiveById?: number | undefined,
    quickbookId?: string,
}