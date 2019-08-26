const express = require('express');
router = express.Router();
const passport = require('passport');

//controllers
const Subscriber =  require('../controllers/Subscriber');
const Customer = require('../controllers/Customers');

//Test
router.get('/', function(req, res) {
    res.json({
        msg: "it works!"
    });
});

//Subscriber Routes
router.post('/signup', Subscriber.create);
router.post('/login', Subscriber.login);

//Customer Routes
router.post('/customer', Customer.create);

module.exports = router;