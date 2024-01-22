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
);

router.get(
    '/',
    validate(Validations.getHomeOwner),
    homeOwnerController.getHomeOwner,
);

router.get(
    '/all',
    validate(Validations.getHomeOwners),
    homeOwnerController.getHomeOwners,
);

router.delete(
    '/',
    validate(Validations.getHomeOwner),
    homeOwnerController.deleteHomeOwner,
);

router.put(
    '/',
    validate(Validations.updateHomeOwner),
    homeOwnerController.updateHomeOwner,
);

export default router;