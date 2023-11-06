import { timestamp } from "aws-sdk/clients/cloudfront";

export interface IServiceTickets {
    alternativeId: string;
    createdAt: timestamp;
    dueDate?: timestamp | null;
    customerId?: number | null;
    createdById: number;
    note: string;
    customerContactId?: number | null;
    customerPO: string;
    image: string;
    images?: string | null;
    companyId: number;
    technicianId: number;
    status: number;
    editedById: number;
    editedAt: timestamp;
    ticketId: string;
    jobLocationId: number;
    jobSiteId: number;
    isHomeOccupied: boolean;
    homeOwnerId: number;
    homeJobLocationId: number;
    homeJobSiteId: number;
    jobTypeId: number;
    itemId: number;
    jobCreated: boolean;
    source: string;
    workTypeId: number;
    companyLocationId: number;
    pooverriddenById: number;
    type: "Ticket" | "PORequest" | "AllPORequest"; 
    emailHistory: string[]; 
    lastEmailSent: timestamp;
    bouncedEmailFlag: boolean;
}

export interface IServiceTicketInput {
    keyword?: string;
    status?: number;
    startDate?: string;
    endDate?: string;
    customerId?: number;
    technicianIds?: number[];
    nextCursor?: string;
    previousCursor?: string;
    currentPage: number;
    pageSize: number;
    companyId?: number;
    workType?: number[];
    companyLocation?: number[];
    isHomeOccupied?: boolean;
    bouncedEmailFlag?: boolean;
}

export interface IUpdateStatusServiceTicketInput {
    status: number;
}

export interface IServiceTicketDetail {
    id: number;
    companyId: number;
}

export interface ICreateServiceTicketInput {
    userId: number;
    alternativeId: string;
    dueDate?: timestamp | null;
    customerId?: number | null;
    note: string;
    customerContactId?: number | null;
    customerPO: string;
    image: string;
    images?: string[] | null;
    companyId: number;
    technicianId: number;
    status: number;
    ticketId: string;
    jobLocationId: number;
    jobSiteId: number;
    isHomeOccupied: boolean;
    homeOwnerId: number;
    homeJobLocationId: number;
    homeJobSiteId: number;
    jobTypeId: number;
    itemId: number;
    jobCreated: boolean;
    source: string;
    workTypeId: number;
    companyLocationId: number;
    pooverriddenById: number;
    type: "Ticket" | "PORequest" | "AllPORequest"; 
    emailHistory: any[]; 
    bouncedEmailFlag: boolean;
}

export interface IUpdateServiceTicketInput {
    userId: number;
    alternativeId: string;
    dueDate?: timestamp | null;
    customerId?: number | null;
    note: string;
    customerContactId?: number | null;
    customerPO: string;
    image: string;
    images?: string[] | null;
    companyId: number;
    technicianId: number;
    status: number;
    editedAt: timestamp;
    ticketId: string;
    jobLocationId: number;
    jobSiteId: number;
    isHomeOccupied: boolean;
    homeOwnerId: number;
    homeJobLocationId: number;
    homeJobSiteId: number;
    jobTypeId: number;
    itemId: number;
    jobCreated: boolean;
    source: string;
    workTypeId: number;
    companyLocationId: number;
    pooverriddenById: number;
    type: "Ticket" | "PORequest" | "AllPORequest"; 
    emailHistory: any[]; 
    bouncedEmailFlag: boolean;
}