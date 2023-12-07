export interface IJobSite {
    id: number;
    alternativeId: string;
    name: string;
    location: any;
    isActive: boolean;
    address: any;
    locationId: number;
    customerId: number;
    homeOwnerId: number;
}
export interface ICreateJobSiteInput {
    alternativeId: string;
    name: string,
    isActive: boolean;
    location: {
        lat: string,
        long: string
    },
    address: any;
    locationId?: number | null;
    customerId: number;
    homeOwnerId: number;
}
export interface IUpdateJobSiteArgs extends Omit<IUpdateJobSiteInput, 'id'> {}
export interface IUpdateJobSiteInput {
    id: number
    alternativeId: string;
    name: string,
    isActive: boolean;
    location: {
        lat: string,
        long: string
    },
    address: any;
    locationId: number;
    customerId: number;
    homeOwnerId: number;
}