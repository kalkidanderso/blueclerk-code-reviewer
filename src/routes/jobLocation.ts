import express from 'express'
import passport from 'passport'

import { getCompanyId } from '../middleware/company'
import { create, update, get } from '../controllers/jobLocation'

const router: express.Router = express.Router()

router.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    create
)

router.put(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    update
)

router.get('/:id?', get)

export default router