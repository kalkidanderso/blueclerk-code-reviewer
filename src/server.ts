import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import logger from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import cors from 'cors'
import passport from 'passport'
import passportMiddleWare from './middleware/passport'
import { MongoError } from 'mongodb'
import routesV1 from './routes/v1'
import swaggerUi from 'swagger-ui-express'
import * as swaggerDocument from './swagger.json'
// const CronJob = require('cron').CronJob;
import {CronJob} from 'cron'
import request from 'request';
var http = require('http');
//Environment config
dotenv.config()

//Database connection
const { DB_USER, DB_PASS, DB_HOST, DB_NAME } = process.env

mongoose.set('useCreateIndex', true)
console.log('DB_USER:::::::', DB_USER)
console.log('DB_PASS::::::', DB_PASS)
console.log('DB_HOST::::::::', DB_HOST)
console.log('DB:::::', DB_NAME)
console.log( `mongodb+srv://${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`)
mongoose.connect(
  `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`,
  {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false},
  (err: MongoError) => {

    if (err) return console.log(`Database connection error: ${err}`)
    console.log('Database connected successfully')

  }
)

// Application/Server configs
const app: express.Application = express()

//CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.set('port', process.env.PORT || 3000)
app.use(compression())
app.use(cookieParser())
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb', parameterLimit: 10000000}));
app.use(cors())

//Auth middleware
app.use(passport.initialize())
passportMiddleWare(passport)

//Logger
app.use(logger('dev'))
//Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const server = http.createServer(app);
const sio = require("socket.io")(server, {
  handlePreflightRequest: (req:any, res: any) => {
    const headers = {
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
        "Access-Control-Allow-Credentials": true
    };
    res.writeHead(200, headers);
    res.end();
  }
});

sio.on("connection", () => {
  console.log("Connected!");
});
//Router
app.use('/api/v1', routesV1(sio))

new CronJob('0 0 1 * *', function() {
  // console.log('You will see this message every second');
  
    request('http://localhost:'+app.get('port')+'/api/v1/chargeSubscription', function (response: any) {
      console.log(response);
      
    });

}, null, true, 'America/Los_Angeles');

new CronJob('59 23 * * *', function() {
    request('http://localhost:'+app.get('port')+'/api/v1/downgradeCompanies', function (response: any) {
      console.log(response);
    });
}, null, true, 'America/Los_Angeles');

//Starting the server
server.listen(
  app.get('port'),
  (err: any) => {

    if (err) return console.log(`Server start error: ${err}`)
    console.log(`Server started at port: ${app.get('port')}`)

  }
)
// Test comment for GitLab and ClickUp task #307pke