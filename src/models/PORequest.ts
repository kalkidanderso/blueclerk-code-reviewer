import { Document, Schema } from 'mongoose';
import { IServiceTicket, ServiceTicket } from './ServiceTicket';

export interface IPORequest extends IServiceTicket {
    PORequestId: string
}

const PORequestSchema = new Schema({
    PORequestId: {
        type: String
    },
});

export const PORequest = ServiceTicket.discriminator<IPORequest>('PORequest', PORequestSchema);
