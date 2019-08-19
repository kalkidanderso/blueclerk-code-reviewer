const to = require("await-to-js").default;
const { ExtractJwt, Strategy } = require("passport-jwt");
const Subscriber  = require('../models/Subscriber');

module.exports = function(passport) {
  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
  opts.secretOrKey = process.env.jwt_encryption;
  //opts.issuer = "accounts.examplesoft.com";

  passport.use(
    new Strategy(opts, async function(jwt_payload, done) {
      let err, subscriber;
      
      [err, subscriber] = await to(Subscriber.findById(jwt_payload.subscriber_id));

      if (err) return done(err, false);
      if (subscriber) {
        return done(null, subscriber);
      } else {
        return done(null, false);
      }
    })
  );
};
