const Subscriber  = require('../models/Subscriber');
const to = require('await-to-js').default;
const sendEmail = require('../services/aws-ses');

const create = async function(req, res) {
    let subInfo = req.body;
    let err, subscriber;

    const subUser = new Subscriber({...subInfo});

    [err, subscriber] = await to(subUser.save());

    if(err){
        res.status(422).json({ error: err});
    } else {
         sendEmail({to: subscriber.email});
        res.json({user: "created!", subscriber, token: subscriber.getJWT()});
    }
};

module.exports.create = create;

// Login user
const login = async function (req, res) {
    const subLogin = req.body;
    let err, subscriber;
 
    // Returns null if user isn't found.
    [err, subscriber] = await to(Subscriber.findOne({ email: subLogin.email } ));
    if(!subscriber) {
       res.json({error: "That email is not registered", subscriber, err});
    }else if(subscriber){
       // returns an object of the user or false
       isSubscriber = await subscriber.comparePassword(subLogin.password);
       if(!isSubscriber){
          res.json({error: "That password is incorrect"});
       }else{
          res.json({subscriber, token: subscriber.getJWT()});
       }
    }
 }

 module.exports.login = login;
 