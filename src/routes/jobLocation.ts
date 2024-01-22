import express from 'express';
import passport from 'passport';

import { getCompanyId } from '../middleware/company';
import { create, update, get } from '../controllers/jobLocation';
import {validate, Validations} from '../middleware/validator';

const router: express.Router = express.Router();

router.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    validate(Validations.createJobLocation),
    create
);

router.put(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    validate(Validations.updateJobLocation),
    update
);

router.get('/:id?',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    validate(Validations.getJobLocation),
    get
);

export default router;
