import express from 'express'
import {validate, Validations} from '../middlewares/validator'
import passport from 'passport'

import * as userController from '../controllers/user'

const router: express.Router = express.Router()

//Users
router.post('/signup', validate(Validations.signUp), userController.createSubscriber)
router.post('/login', validate(Validations.login), userController.login)

router.post('/adminSignUp', validate(Validations.login), userController.createGlobalAdmin)

router.post('/createManager', passport.authenticate('jwt', {session: false}), validate(Validations.login), userController.createManager)
router.post('/createTechnician', passport.authenticate('jwt', {session: false}), validate(Validations.login), userController.createTechnician)
router.post('/createOfficeAdmin', passport.authenticate('jwt', {session: false}), validate(Validations.login), userController.createOfficeAdmin)

router.post('/getManagers', passport.authenticate('jwt', {session: false}), userController.getManagersList)
router.post('/getTechnicians', passport.authenticate('jwt', {session: false}), userController.getTechniciansList)
router.post('/getOfficeAdmins', passport.authenticate('jwt', {session: false}), userController.getOfficeAdminsList)

export default router
