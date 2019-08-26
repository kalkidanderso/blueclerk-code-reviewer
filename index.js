const express = require("express");
const logger = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require("passport");

dotenv.config();
const app = express();

//Database connection
const { DB_USER, DB_PASS, DB_HOST, DB_NAME } = process.env;
mongoose.connect(`mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`, {useNewUrlParser: true},
()=> console.log("Connected to MongoDB"));

//Server settings
app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());
app.use(logger("dev"));

dotenv.config();

//Passport
app.use(passport.initialize());

const V1 = require('./routes/V1');

app.use('/v1',V1);

app.use('/', function(req, res) {
  if(req.headers.authorization !== 'ScoobySnacks') {
    res.status(401).json({success: false, msg: 'You do not have Scooby Snacks' })
  }else{
    res.status(200).json({ success: true, msg: 'I love Scooby Snacks!' })
  }
})

app.listen(app.get("port"),'0.0.0.0',function(err,) {
  console.log("Express server listening on port " + app.get("port"));
});