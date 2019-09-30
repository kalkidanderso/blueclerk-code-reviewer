import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { Group, IGroup } from '../models/Group'
import { Company, ICompany } from '../models/Company'

export const createGroup = (req: Request, res: Response) => {

    const params = req.body

    const group = new Group(
        {
            title:  params.title,
            company: req.companyId,
            manager: '',
        }
    )

    group.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Group created successfully.'})

    })

}


export const getGroups = (req: Request, res: Response) => {

    Group.find({company: req.companyId})
    .populate({
        path: 'manager',
    })
    .populate({
        path: 'members',
    })
    .exec((err: any, groups: IGroup[]) => {

        if (err || !groups) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'groups': groups})    
    })
}


export const deleteGroup = (req: Request, res: Response) => {

    const params = req.body
    const user = <ICompany>req.user
    
    var companyId = user._id

    Group.findOne({_id: params.groupId, company: companyId})
    .exec((err: any, group: IGroup) => {

        if (!err && !group) {
            return res.json({'status': Status.Error, 'message': 'Invalid groupId.'})
        }
        
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        Group.deleteOne({_id: group._id})
        .exec((err: any) => {
    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
    
            return res.json({'status': Status.Success, 'message': 'Group deleted successfully.'})    
        })
    })

}


export const addManager = (req: Request, res: Response) => {

    const params = req.body

    Group.findOne({_id: params.groupId, company: req.companyId})
    .exec((err: any, group: IGroup) => {

        if (err || !group) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        group.update(
            {manager: params.managerId},
            (err: any, raw: any)=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Manager added to group successfully.'})
        })
        
    })

}

export const addMember = (req: Request, res: Response) => {

    const params = req.body
  
    Group.findOne({_id: params.groupId, company: req.companyId})
    .exec((err: any, group: IGroup) => {

        if (err || !group) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(group.members.indexOf(params.memberId) !== -1) {
            return res.json({'status': Status.Error, 'message': 'Member already exist in group.'})
        }

        group.members.push(params.memberId)

        group.update(
            {members: group.members},
            (err: any, raw: any)=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Member added to group successfully.'})
        })
        
    })

}

export const removeMember = (req: Request, res: Response) => {

    const params = req.body

    Group.findOne({_id: params.groupId, company: req.companyId})
    .exec((err: any, group: IGroup) => {

        if (err || !group) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        var index = group.members.indexOf(params.memberId)
        
        if(index === -1) {
            return res.json({'status': Status.Error, 'message': 'Member already removed from group.'})
        } 
          
        group.members.splice(index, 1)
        
        group.update(
            {members: group.members},
            (err: any, raw: any)=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Member removed from group successfully.'})
        })
        
    })

}
