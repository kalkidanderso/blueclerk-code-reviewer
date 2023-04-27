import express from 'express';

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

router.get(
    '/:id',
    validate(Validations.getHomeOwner),
    homeOwnerController.getHomeOwner,
)

router.get(
    '/getAll', // TODO CHANGE TO URL PARAM INSTEAD OF BODY
    validate(Validations.getHomeOwners),
    homeOwnerController.getHomeOwners,
)

export default router;
// TODO CHECK MONGODB DEPENDENCY BUILD BEFORE REQUEST