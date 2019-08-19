const express = require('express');
const passport = require('passport');

//controllers
const Assets = require('../controllers/assets');
const Users = require('../controllers/users');
const Customers = require('../controllers/customer');

require('../middleware/passport')(passport);

router = express.Router();

// Subscriber Routes
router.post('/signup', Users.create)
router.post('/login', Users.login);

// User Routes
router.get("/", function(req, res) {
  res.json({ success: true, path: req.path });
});

router.post('/users', Users.create);
router.get('/users', passport.authenticate('jwt', { session: false }), Users.getUsers);

// Assest Routes
router.get('/assets', Assets.getAssets);
router.post('/assets', Assets.create);

// Customer Routes 
router.post('/customers', Customers.create);
router.get('/customers', Customers.getCustomers)

router.post("/customers/locations", Customers.createLocation);
router.get("/customers/locations", Customers.getLocations);

module.exports = router;
