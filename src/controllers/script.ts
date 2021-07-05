import { Request, Response } from 'express';

import { Status } from '../common/constants';

import { Company } from '../models/Company';
import { Customer } from '../models/Customer';
import { IPriceTier } from '../models/PriceTier';

import { _addItemTier } from '../controllers/company';

/**
 * To update all companies and customers to have Item Price Tier,
 * will create 1 new Item Tier to be the default,
 * and assign it to the customers
 */
export const syncItemTier = async (req: Request, res: Response) => {

    // Find all companies from the database
    const companies = await Company.find({}).populate({ path: 'itemTier.list.tier' });

    if (!companies?.length)
        return res.json({ status: Status.OK, message: 'No companies to update' });

    // Iterate all companies
    for (const company of companies) {
        console.log('== company._id:', company._id);
        console.log('== company.itemTier:', JSON.stringify(company.itemTier?.list));
        
        // Take company first active tier if any
        let itemTier = company.itemTier?.list?.find(t => {
            const tier = <IPriceTier>t.tier;
            return tier.isActive;
        })?.tier;

        // Check if company has tier or not
        if (company.itemTier?.list?.length <= 0) {
            // Company doesn't have item tier, create new one
            await _addItemTier(company, (err, createdItemTier) => {
                console.log('== createdItemTier:', createdItemTier);
                itemTier = createdItemTier;

                if (err)
                    return res.json({ status: Status.Error, message: err.message });
            })
        }

        console.log('== itemTier:', itemTier);

        const customers = await Customer.find({ company });

        for (const customer of customers) {
            if (!customer.itemTier) {
                console.log('== customer._id:', customer._id);
                console.log('== customer.itemTier:', customer.itemTier);
                customer.itemTier = itemTier;
                await customer.save();
            }
        }

    }

    return res.json({ status: Status.OK, message: 'Companies and customers successfully updated.' });

}
