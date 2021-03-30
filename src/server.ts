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

//Environment config
import moment from 'moment-timezone';
import {EmailSchedule, IEmailSchedule} from './models/EmailSchedule';
import {IUser, User} from './models/User';
import {IJob, Job} from './models/Job';
import {sendJobEmailToAssignee, sendScheduledJobEmailToAssignee} from './services/aws';
import {Company} from './models/Company';
import {Customer} from './models/Customer';
import {Status} from './common/constants';
const timeout = require('connect-timeout');

dotenv.config()
process.env.TZ = 'America/Chicago';
//Database connection
const { DB_USER, DB_PASS, DB_HOST, DB_NAME } = process.env

mongoose.set('useCreateIndex', true)
mongoose.connect(
  // 'mongodb://localhost:27017/norton',
  `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`,
  {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false},
  (err: MongoError) => {

    if (err) return console.log(`Database connection error: ${err}`)
    console.log('Database connected successfully')

  }
)

// Application/Server configs
const app = require('express')();

app.use(timeout('1200s'));

app.use(haltOnTimeout);

function haltOnTimeout (req: any, res: any, next: any) {
    if (!req.timedout) {
        next()
    } else {
        res.json({'Status' : Status.TimeOut, 'message': 'TimeOut! Request took too long'});
    }
}


//CORS
app.use(function(req: any, res: any, next: any) {
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

const httpServer = require('http').createServer(app);
const sio = require("socket.io")(httpServer, {
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

sio.on("connection", (socket:any) => {
  console.log("Connected!");
  socket.on('message', () => {
    console.log('Message received from FE!');
  });
});
sio.on('disconnect', (socket:any) => {
  console.log('Disconnected at ', new Date());
})
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


/**
 * This is for email scheduling
 */
try {
    let emailQueue: any[] = [];
    new CronJob('* * * * *', async function() {
        await EmailSchedule.find({pulled: false, _id: {$nin: emailQueue}}).populate('user').populate('jobs').exec()
            .then(async (schedules: IEmailSchedule[]) => {
            if (schedules.length) {
                // TODO: create a cron job for all users
                for (let emailSchedule of schedules) {
                    //Check if emailSchedule is already in emailQueue
                    if (emailQueue.filter((e) => JSON.stringify(e) == JSON.stringify(emailSchedule._id)).length == 0) {
                        // Get User Schedule time
                        let user: any = emailSchedule.user;
                        // either company contractor or employee/admin
                        let userScheduleTime = user.emailPreferences;
                        let to: string;
                        let assigneeName: string;
                        switch (emailSchedule.type) {
                            case 1: {
                                let contractor = await Company.findOne({admin: emailSchedule.user});
                                to = contractor.info.companyEmail;
                                assigneeName = contractor.info.companyName;
                                break;
                            }
                            case 2: {
                                let customer = await Customer.findOne({_id: emailSchedule.user});
                                to = customer.info.email;
                                assigneeName = customer.contactName;
                                break;
                            }
                            default: {
                                let employee = await User.findOne({_id: emailSchedule.user});
                                to = employee.auth.email;
                                assigneeName = user.profile.displayName;
                                break;
                            }
                        }
                        let sendDate;
                        let timeZone = userScheduleTime ? userScheduleTime.timeZone : 'America/Chicago';
                        if (userScheduleTime) {
                            let hours = userScheduleTime.time ? userScheduleTime.time.getHours() : 21;
                            let minutes = userScheduleTime.time ? userScheduleTime.time.getMinutes() : 0;
                            sendDate = moment().tz(timeZone).hours(hours).minutes(minutes).seconds(58);
                        } else {
                            sendDate = moment().tz(timeZone).hours(21).minutes(0).seconds(58);
                        }
                        emailQueue.push(emailSchedule._id);
                        if (!emailSchedule.pulled && moment().tz(timeZone).diff(sendDate) < 0) {
                            new CronJob(sendDate, async function() {
                                let doc:any = await EmailSchedule.findOne({_id: emailSchedule._id});
                                sendScheduledJobEmailToAssignee(doc.jobs, to, assigneeName, emailSchedule);
                                emailQueue = emailQueue.filter((e) => JSON.stringify(e) !== JSON.stringify(emailSchedule._id));
                            }, null, true);
                        }
                    }
                }
            }
        });
    }, null, true);

} catch (err) {
    console.log({error: err.message});

}

//Starting the server
httpServer.listen(
  app.get('port'),
  (err: any) => {

    if (err) return console.log(`Server start error: ${err}`)
    console.log(`Server started at port: ${app.get('port')}`)
  }
)
// Test comment for GitLab and ClickUp task #307pke
