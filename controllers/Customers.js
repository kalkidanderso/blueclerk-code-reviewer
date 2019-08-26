const Customer  = require('../models/Customers');
const to = require('await-to-js').default;

const create = async function(req, res) {
    let customerInfo = req.body;
    let err, customer;

    //Ensure that customer is created under Subscribers account via token.
    //if(customerInfo.subscriber)

    const newCustomer = new Customer({...customerInfo});

    [err, customer] = await to(newCustomer.save());

    if(err){
        res.status(422).json({ error: err});
    } else {
        res.json({user: "created!", customer});
    }
};

module.exports.create = create;
