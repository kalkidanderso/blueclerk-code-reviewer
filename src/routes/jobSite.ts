import express from 'express'
import passport from 'passport'

import { getCompanyId } from '../middleware/company'
import { create, get } from '../controllers/jobSite'

const router: express.Router = express.Router()

router.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    create
)

router.get('/', get)

export default router