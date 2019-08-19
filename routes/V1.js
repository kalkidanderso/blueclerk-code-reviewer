const express = require('express');
router = express.Router();
const passport = require('passport')

//controllers
const Subscriber =  require('../controllers/Subscriber');

//Test
router.get('/', function(req, res) {
    res.json({
        msg: "it works!"
    });
});

//Subscriber Routes
router.post('/signup', Subscriber.create);
router.post('/login', Subscriber.login)

module.exports = router;