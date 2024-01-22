import { getClientForOrg } from './helpers';
import * as config from './config.json';

export const queryChaincode = async (
    fcn: any,
    args: any,
    channelName = config.channelName,
    chaincodeName = config.chainCodeName,
    orgName = config.orgName,
    userName = config.defaultOrgUser,
) => {
    const { fabricClient } = await getClientForOrg();
    const channel = fabricClient.getChannel(channelName);
    const userFromStore = await fabricClient.getUserContext(userName, true);
    if (!channel) {
        throw new Error('Provided Channel is not defined in connection profile');
    }
    if (!userFromStore || !userFromStore.isEnrolled()) {
        throw new Error('Failed to load user.... run registerUser.js');
    }

    const request = {
    // targets: [peer], //queryByChaincode allows for multiple targets
        chaincodeId: chaincodeName,
        fcn: fcn,
        args: args,
    };
    return channel.queryByChaincode(request);
};
