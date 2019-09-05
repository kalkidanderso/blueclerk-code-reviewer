"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
app.set('port', process.env.PORT || 3000);
app.use(compression_1.default());
app.use(cookie_parser_1.default());
app.use(body_parser_1.default.json({ limit: '50mb' }));
app.use(body_parser_1.default.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000000 }));
app.use(cors_1.default());
app.use(passport_1.default.initialize());
passport_2.default(passport_1.default);
app.use(morgan_1.default('dev'));
app.use('/api/v1', v1_1.default);
//Starting the server
app.listen(app.get('port'), (err) => {
    if (err)
        return console.log(`Server start error: ${err}`);
    console.log(`Server started at port: ${app.get('port')}`);
});
//# sourceMappingURL=server.js.map