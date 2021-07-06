import { Request, Response } from 'express';

import { Status } from '../common/constants';

import { Company } from '../models/Company';
import { Customer } from '../models/Customer';
import { IPriceTier, PriceTier } from '../models/PriceTier';

import { _addItemTier } from '../controllers/company';

/**
 * To sync and update all companies and customers to have Item Price Tier,
 * will create 1 new Item Tier to be the default,
 * and assign it to the customers
 */
export const syncItemTier = async (req: Request, res: Response) => {

    const updatedCompanies: string[] = [];
    const updatedCustomers: string[] = [];
    const createdItemTiers: string[] = [];

    // Find all companies from the database
    const companies = await Company.find({}).populate({ path: 'itemTier.list.tier' });

    if (!companies?.length)
        return res.json({ status: Status.OK, message: 'No companies to update' });

    // Iterate all companies
    for (const company of companies) {

        // Take company first active tier if any
        let itemTier = company.itemTier?.list?.find(t => {
            const tier = <IPriceTier>t.tier;
            return tier.isActive;
        })?.tier;

        if (!itemTier) {
            // Company doesn't have item tier, create new one
            await _addItemTier(company, (err, createdItemTier) => {
                if (err)
                    return res.json({ status: Status.Error, message: err.message });

                itemTier = createdItemTier;
                updatedCompanies.push(company._id);
                createdItemTiers.push(createdItemTier?._id);
            })
        }

        // Find all customers owned by the company
        const customers = await Customer.find({ company });

        // Iterate all customers
        for (const customer of customers) {
            const custItemTier = await PriceTier.findById(customer?.itemTier);

            // Check if customer has itemTier and the status of itemTier
            if (!custItemTier || !custItemTier?.isActive) {
                customer.itemTier = itemTier;
                await customer.save();
                updatedCustomers.push(customer._id);
            }
        }

    }

    return res.json({
        status: Status.OK,
        message: 'Companies and customers successfully updated.',
        updatedCompanies, updatedCustomers, createdItemTiers
    });

}
