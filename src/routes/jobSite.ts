import express from 'express'
import passport from 'passport'

import { create, update, get } from '../controllers/jobSite'

const router: express.Router = express.Router()

router.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    create
)

router.put(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    update
)

router.get('/:id?', get)

export default router