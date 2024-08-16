import express from 'express';
import passport from 'passport';

import { create, update, get, search } from '../controllers/jobSite';
import { getCompanyId } from '../middleware/company';
import { validate, Validations } from '../middleware/validator';


const router: express.Router = express.Router();

router.get('/name',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    validate(Validations.searchJobSite),
    search
);

router.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    create
);

router.put(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    update
);

router.get('/:id?', get);

export default router;