import express from 'express';
import passport from 'passport';

import { validate, Validations } from '../middleware/validator';
import { uploadImageInS3 } from '../middleware/multer';
import { getCompanyId } from '../middleware/company';

import * as chatController from '../controllers/chat';

const router: express.Router = express.Router();

router.get(
    '/:chatChannel/:id',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    validate(Validations.getJobRequestChats),
    chatController.getChats
);

router.post(
    '/:chatChannel/:id',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    uploadImageInS3.fields([{ name: 'images' }]),
    validate(Validations.createJobRequestChat),
    chatController.createChat
);

router.post(
    '/:chatChannel/:id/markRead',
    passport.authenticate('jwt', { session: false }),
    getCompanyId(),
    validate(Validations.markReadJobRequestChat),
    chatController.markRead
);

export default router;
