import * as config from './config.json';
import FabricCAClient from 'fabric-ca-client';
import { getClientForOrg } from './helpers';
import * as Sentry from '@sentry/node';

const registerNewUser = async (username: any, client: any, orgName: any) => {
    // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
    let adminUser;
    let fabricCaClient: any;
    const retnValue = client
        .getUserContext('admin', true)
        .then((userFromStore: any) => {
            const tlsOptions = {
                trustedRoots: [],
                verify: false,
            } as any;

            const caName = config.caName;

            fabricCaClient = new FabricCAClient(
                config.networkCaUrl,
                tlsOptions,
                caName,
                client.getCryptoSuite(),
            );

            if (userFromStore && userFromStore.isEnrolled()) {
                console.log('Successfully loaded user from persistence');
                adminUser = userFromStore;
            } else {
                throw new Error('Failed to get user...');
            }
            // at this point we should have the admin user
            // first need to register the user with the CA server
            const attributes = [{ name: 'orgName', value: orgName, ecert: true }];
            return fabricCaClient.register(
                {
                    enrollmentID: username,
                    affiliation: 'org1.department1',
                    attrs: attributes,
                },
                adminUser,
            );
        })
        .then((secret: any) => {
            // next we need to enroll the user with CA server
            console.log(`Successfully registered ${username} - secret: ${secret}`);
            const attributes = [{ name: 'orgName', value: orgName, ecert: true }];
            return fabricCaClient.enroll({
                enrollmentID: username,
                enrollmentSecret: secret,
                attrs: attributes,
            });
        })
        .then((enrollment: any) => {
            console.log(`Successfully enrolled member ${username}`);

            const mspName = config.mspName;

            return client.createUser({
                username: username,
                mspid: mspName,
                cryptoContent: {
                    privateKeyPEM: enrollment.key.toBytes(),
                    signedCertPEM: enrollment.certificate,
                },
            });
        })
        .then((user: any) => {
            return client.setUserContext(user);
        })
        .catch((err: any) => {
            Sentry.captureException(err);
            console.error('Failed to register: ' + err);
            if (err.toString().indexOf('Authorization') > -1) {
                console.error(
                    'Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
            'Try again after deleting the contents of the store directory ',
                );
            }
        });
    return retnValue;
};

export const getRegisteredUser = async (
    username = config.defaultOrgUser,
    orgName = config.orgName,
) => {
    let user;
    const { fabricClient: client } = await getClientForOrg();
    user = await client.getUserContext(username, true);
    if (user && user.isEnrolled()) {
        console.log(`Successfully loaded member ${username} from persistence`);
    } else {
        user = await registerNewUser(username, client, orgName);
    }

    if (user && user.isEnrolled) {
        console.log(user._enrollmentSecret);
    } else {
        throw new Error('User was not enrolled ');
    }
    return user;
};
