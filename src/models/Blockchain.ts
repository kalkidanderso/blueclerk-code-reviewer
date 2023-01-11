export enum InvocationChaincodes {
    CREATE_NEW_IDENTITY = 'createNewIdentity',
    VERIFY_EXISTING_IDENTITY = 'verifyExistingIdentity',
    CREATE_BULK_IDENTITES = 'createBulkIdentites',
    UPDATE_EXISTING_IDENTITY = 'updateExistingIdentity',
    SUSPEND_EXISTING_IDENTITY = 'suspendExistingIdentity'
}

export enum QueryChaincodes {
    GET_ASSET_BY_ID = 'getAssetByID',
    GET_ALL_ASSETS = 'getAllAssets',
    IDENTITIES_DYNAMIC_QUERY = 'identitiesDynamicQuery',
    GET_HISTORY_FOR_ASSET = 'getHistoryForAsset'
}

export enum SystemNames {
    BLUECLERK = 'blueclerk'
}

export enum IdentityTypes {
    VENDOR = 'vendor',
    TECHNICIAN = 'technician',
    INSURANCE_AGENT = 'insuranceAgent'
}

export enum VerificationDocumentTypes {
    PASSPORT = 'passport',
    DRIVING_LICENSE = 'drivingLicense',
    GOVERNMENT_ID = 'governmentId'
}
