import express from 'express';
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import logger from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import bodyParser from 'body-parser'
import cors from 'cors'
import passport from 'passport'
import passportMiddleWare from './middleware/passport'
import { MongoError } from 'mongodb'
import routesV1 from './routes/v1'
import routesV2 from './routes/v2'
import swaggerUi from 'swagger-ui-express'
import * as swaggerDocumentV1 from './swagger_v1.json'
import * as swaggerDocumentV2 from './swagger_v2.json'

// const CronJob = require('cron').CronJob;
import { CronJob } from 'cron'
import request from 'request';
import socketioJwt from 'socketio-jwt';
import * as Sentry from '@sentry/node';

//Environment config
import moment from 'moment-timezone';
import { EmailSchedule, IEmailSchedule } from './models/EmailSchedule';
import { IUser, User } from './models/User';
import { IEmployee, Employee } from './models/Employee';
import { ICompanyAdmin } from './models/CompanyAdmin'
import { Job } from './models/Job';
import { sendScheduledJobEmailToAssignee } from './services/aws';
import { Company } from './models/Company';
import { Customer } from './models/Customer';
import { Status, Messages, JobStatus } from './common/constants';
import { _initializeFirebase } from './services/firebase';
import { getRegisteredUser } from './blockchain/registerUser';
const timeout = require('connect-timeout');
const MongoStore = require('connect-mongo');

dotenv.config()
process.env.TZ = 'America/Chicago';
//Database connection
const { DB_USER, DB_PASS, DB_HOST, DB_NAME, session_secret, jwt_encryption } = process.env
const dbConnect = DB_HOST === 'localhost'
  ? `mongodb://${DB_HOST}/${DB_NAME}`
  : `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;

mongoose.set('useCreateIndex', true)
mongoose.connect(
  dbConnect,
  { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false },
  (err: MongoError) => {

    if (err) return console.log(`Database connection error: ${err}`)
    console.log('Database connected successfully')

  }
)

// Application/Server configs
const app = require('express')();

Sentry.init({
  dsn: "https://7ce3dc3af480456e9351a3df61cd166a@o4505155845226496.ingest.sentry.io/4505156270686208",
  tracesSampleRate: 1.0,
  environment: process.env.ENVIRONMENT
});


app.use(timeout('1200s'));

app.use(haltOnTimeout);

function haltOnTimeout(req: any, res: any, next: any) {
  if (!req.timedout) {
    next()
  } else {
    res.json({ 'Status': Status.TimeOut, 'message': 'TimeOut! Request took too long' });
  }
}

// Handle session
app.use(
  session({
    secret: session_secret || jwt_encryption,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      secure: true,
    },

    // Database settings to session
    store: MongoStore.create({
      mongoUrl: dbConnect,
      mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
      collectionName: 'sessions',
      autoRemove: 'native' // Remove session when expired
    }),
  })
);

app.set('port', process.env.PORT || 3000)
app.use(compression())
app.use(cookieParser())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 10000000 }));
// To allow requests from all origins using the wildcard
app.use(cors({ origin: '*', credentials: true }));
// To enable pre-flight across-the-board
app.options('*', cors());


//Auth middleware
app.use(passport.initialize())
app.use(passport.session());
passportMiddleWare(passport)

//Logger
app.use(logger('dev'))

//Swagger
const options = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: '/swagger/v1',
        name: 'Version 1'
      },
      {
        url: '/swagger/v2',
        name: 'Version 2'
      }
    ]
  }
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, options));
const swaggerRoutes = ()=>{
  const router: express.Router = express.Router();
  //Documentation version 1
  router.get('/v1', async (req, res) => {
    swaggerDocumentV1.servers.push({ url: process.env.BASE_URL || "https://blueclerk-node-api.deploy.blueclerk.com/api/v1" });
    return res.json(swaggerDocumentV1);
  })

  //Documentation version 1
  router.get('/v2', async (req, res) => {
    swaggerDocumentV2.servers.push({ url: process.env.BASE_URL_V2 || "https://blueclerk-node-api.deploy.blueclerk.com/api/v2" });
    return res.json(swaggerDocumentV2);
  })
  return router;
}
app.use('/swagger', swaggerRoutes());


const httpServer = require('http').createServer(app);
const sio = require("socket.io")(httpServer, {
  cors: true,
  origins: ["https://blueclerk-frontend-react.deploy.blueclerk.com", 'http://testing.blueclerk.com', 'https://app.blueclerk.com', 'https://staging-suppliers.blueclerk.com'],
  transport: ['websocket']

});

// Initialize Firebase
_initializeFirebase();

// Authenticate Socket client by its Authorization token
sio.use(socketioJwt.authorize({
  secret: process.env.jwt_encryption,
  handshake: true,
  auth_header_required: true
}));

sio.on("connection", (socket: any) => {
  console.log("Connected!");

  // Find if the user exists and retrieve his/her company ID
  User.findOne(
    { _id: socket.decoded_token.id },
    (err: any, user: ICompanyAdmin) => {
      if (err || !user) {
        // emit the error
        socket.emit(Messages.UnAuthorized, 'User not found');
      } else {
        // Let the client joins the room based on their company_id
        socket.join(user.company?.toString());
        // Let the client join private room from req.user
        socket.join(user.company?.toString() + user.id?.toString())
      }
    }
  )

  socket.on('message', () => {
    console.log('Message received from FE!');
  });
});
sio.on('disconnect', (socket: any) => {
  console.log('Disconnected at ', new Date());
})
app.use('/api/v1', routesV1(sio))
app.use('/api/v2', routesV2())
new CronJob('0 0 1 * *', function () {
  // console.log('You will see this message every second');

  request('http://localhost:' + app.get('port') + '/api/v1/chargeSubscription', function (response: any) {
    console.log(response);

  });

}, null, true, 'America/Chicago');

// new CronJob('59 23 4 * *', function () {
//   request('http://localhost:' + app.get('port') + '/api/v1/downgradeCompanies', function (response: any) {
//     console.log(response);
//   });
// }, null, true, 'America/Chicago');

// Cron Job to finalize all draft company invoices at the end of each day
new CronJob('59 23 * * *', () => {
  request(`http://localhost:${app.get('port')}/api/v1/finalizeStripeInvoices`, (response: any) => {
    console.log('== response:', response);
  });
}, null, true, 'America/Chicago');

// Cron Job to update commisions for those set on future date at the beginning of each day
new CronJob('1 0 * * *', () => {
  request(`http://localhost:${app.get('port')}/api/v1/updateCommissionCron`, (response: any) => {
    console.log('== response:', response);
  });
}, null, true, 'America/Chicago');

// Cron Job to handle and update all incomplete job at the end of each day
// new CronJob('59 23 * * *', async () => {
//   try {
//     await Job.updateMany(
//       { 'tasks.status': { $in: [JobStatus.STARTED, JobStatus.PAUSED] } },
//       { $set: { 'tasks.$.status': JobStatus.INCOMPLETE, status: JobStatus.INCOMPLETE } }
//     ).exec();
//   } catch (err) {
//     console.log('== Handle incomplete jobs err:', err);
//   };
// }, null, true, 'America/Chicago');

/**
 * This is for email scheduling
 */
/**
 * Kris' remark (April 14th, 2022):
 * Disable the email cron for now,
 * because we don't need this feature as per say
 */
//  try {
//   let emailQueue: any[] = [];
//   new CronJob('* * * * *', async function () {
//     await EmailSchedule.find({ pulled: false, _id: { $nin: emailQueue } }).populate('user').populate('jobs').exec()
//       .then(async (schedules: IEmailSchedule[]) => {
//         if (schedules.length) {
//           for (let emailSchedule of schedules) {
//             //Check if emailSchedule is already in emailQueue
//             if (emailQueue.filter((e) => JSON.stringify(e) == JSON.stringify(emailSchedule._id)).length == 0) {
//               // Get User Schedule time
//               let user: any = emailSchedule.user;
//               // either company contractor or employee/admin
//               let userScheduleTime = user.emailPreferences;
//               let to: string;
//               let replyTo: string;
//               let assigneeName: string;
//               switch (emailSchedule.type) {
//                 case 1: {
//                   let contractor = await Company.findOne({ admin: emailSchedule.user });
//                   to = contractor.info.companyEmail;
//                   assigneeName = contractor.info.companyName;
//                   break;
//                 }
//                 case 2: {
//                   let customer = await Customer.findOne({ _id: emailSchedule.user });
//                   to = customer.info.email;
//                   let company = await Company.findOne({ company: customer.company });
//                   replyTo = company.info.companyEmail;
//                   assigneeName = customer.contactName;
//                   break;
//                 }
//                 default: {
//                   let employee = await Employee.findOne({ _id: emailSchedule.user });
//                   to = employee.auth.email;
//                   assigneeName = user.profile.displayName;

//                   let company = await Company.findOne({ _id: employee.company });
//                   replyTo = company.info.companyEmail;
//                   break;
//                 }
//               }
//               let sendDate;
//               let timeZone = userScheduleTime ? userScheduleTime.timeZone : 'America/Chicago';
//               if (userScheduleTime) {
//                 let hours = userScheduleTime.time ? userScheduleTime.time.getHours() : 21;
//                 let minutes = userScheduleTime.time ? userScheduleTime.time.getMinutes() : 0;
//                 sendDate = moment().tz(timeZone).hours(hours).minutes(minutes).seconds(58);
//               } else {
//                 sendDate = moment().tz(timeZone).hours(21).minutes(0).seconds(58);
//               }
//               emailQueue.push(emailSchedule._id);
//               if (!emailSchedule.pulled && moment().tz(timeZone).diff(sendDate) < 0) {
//                 new CronJob(sendDate, async function () {
//                   let doc: any = await EmailSchedule.findOne({ _id: emailSchedule._id });
//                   sendScheduledJobEmailToAssignee(doc.jobs, to,replyTo, assigneeName, emailSchedule);
//                   emailQueue = emailQueue.filter((e) => JSON.stringify(e) !== JSON.stringify(emailSchedule._id));
//                 }, null, true);
//               }
//             }
//           }
//         }
//       });
//   }, null, true);

// } catch (err) {
//   console.log({ error: err.message });

// }

// Register Blockchain User\
(async () => {
  try {
    await getRegisteredUser();
    console.log('Blockchain:: successfully created app user')
  } catch (error) {
    Sentry.captureException(error);
    console.error('Blockchain:: failed to create app user')
  }
})()

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).send(err.message || 'Something went wrong');
});

//Starting the server
const server = httpServer.listen(
  app.get('port'),
  (err: any) => {
    if (err) return console.log(`Server start error: ${err}`)
    console.log(`Server started at port: ${app.get('port')}`)
  }
)

server.keepAliveTimeout = (60 * 1000) + 1000;
server.headersTimeout = (60 * 1000) + 2000;
// Test comment for GitLab and ClickUp task #307pke
