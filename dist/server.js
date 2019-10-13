"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const passport_1 = __importDefault(require("passport"));
const passport_2 = __importDefault(require("./middlewares/passport"));
const v1_1 = __importDefault(require("./routes/v1"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerDocument = __importStar(require("./swagger.json"));
// const CronJob = require('cron').CronJob;
const cron_1 = require("cron");
const request_1 = __importDefault(require("request"));
//Environment config
dotenv_1.default.config();
//Database connection
const { DB_USER, DB_PASS, DB_HOST, DB_NAME } = process.env;
mongoose_1.default.set('useCreateIndex', true);
mongoose_1.default.connect(`mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`, { useNewUrlParser: true }, (err) => {
    if (err)
        return console.log(`Database connection error: ${err}`);
    console.log('Database connected successfully');
});
// Application/Server configs
const app = express_1.default();
//CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.set('port', process.env.PORT || 3000);
app.use(compression_1.default());
app.use(cookie_parser_1.default());
app.use(body_parser_1.default.json({ limit: '50mb' }));
app.use(body_parser_1.default.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000000 }));
app.use(cors_1.default());
//Auth middleware
app.use(passport_1.default.initialize());
passport_2.default(passport_1.default);
//Logger
app.use(morgan_1.default('dev'));
//Swagger
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
//Router
app.use('/api/v1', v1_1.default);
new cron_1.CronJob('0 0 1 * *', function () {
    // console.log('You will see this message every second');
    request_1.default('http://localhost:' + app.get('port') + '/api/v1/chargeSubscription', function (response) {
        console.log(response);
    });
}, null, true, 'America/Los_Angeles');
//Starting the server
app.listen(app.get('port'), (err) => {
    if (err)
        return console.log(`Server start error: ${err}`);
    console.log(`Server started at port: ${app.get('port')}`);
});
//# sourceMappingURL=server.js.map