import express from 'express';
import passport from 'passport';

import { validate, Validations } from '../middleware/validator';
import { uploadImageInS3 } from '../middleware/multer';

import * as homeOwnerController from '../controllers/homeOwner';

const router: express.Router = express.Router();

// HOME OWNER ROUTES

router.post(
    '/',
    uploadImageInS3.fields([{ name: 'image' }]),
    validate(Validations.createHomeOwner),
    homeOwnerController.createHomeOwner
)

export default router;
