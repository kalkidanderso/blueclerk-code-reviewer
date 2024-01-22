import mongoose, { Document, Schema } from 'mongoose';
import { IWorkType } from './WorkType';
import { IEmployee } from './Employee';

export interface IAssignedEmployee extends Document {
    employee: Schema.Types.ObjectId | IEmployee
    workTypes: [Schema.Types.ObjectId | IWorkType]
}

export const AssignedEmployeeSchema = new Schema({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    workTypes: [{ type: Schema.Types.ObjectId, ref: 'WorkType' }]
});

export const AssignedEmployee = mongoose.model<IAssignedEmployee>('AssignedEmployee', AssignedEmployeeSchema);
