import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import logger from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import cors from 'cors'
import passport from 'passport'
import passportMiddleWare from './middlewares/passport'
import { MongoError } from 'mongodb'
import routesV1 from './routes/v1'
import swaggerUi from 'swagger-ui-express'
import * as swaggerDocument from './swagger.json'

//Environment config
dotenv.config()

//Database connection
const { DB_USER, DB_PASS, DB_HOST, DB_NAME } = process.env
mongoose.set('useCreateIndex', true)
mongoose.connect(
  `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`,
  {useNewUrlParser: true},
  (err: MongoError) => {

    if (err) return console.log(`Database connection error: ${err}`)
    console.log('Database connected successfully')

  }
)

// Application/Server configs
const app: express.Application = express()

app.set('port', process.env.PORT || 3000)
app.use(compression())
app.use(cookieParser())
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb', parameterLimit: 1000000}));
app.use(cors())

//Auth middleware
app.use(passport.initialize())
passportMiddleWare(passport)

//Logger
app.use(logger('dev'))

//Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//Router
app.use('/api/v1', routesV1)

//Starting the server
app.listen(
  app.get('port'),
  (err: any) => {

    if (err) return console.log(`Server start error: ${err}`)
    console.log(`Server started at port: ${app.get('port')}`)

  }
)