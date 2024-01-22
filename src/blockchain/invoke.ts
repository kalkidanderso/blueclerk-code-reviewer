import { getClientForOrg } from './helpers';
import * as config from './config.json';
import * as Sentry from '@sentry/node';

export const invokeChaincode = async (
    fcn: any,
    args: any,
    channelName = config.channelName,
    chaincodeName = config.chainCodeName,
    userName = config.defaultOrgUser,
) => {
    const returnValue = {
        isValid: false,
        transaction: {},
    };

    const { fabricClient, peer } = await getClientForOrg();
    const channel = fabricClient.getChannel(channelName);
    const userFromStore = await fabricClient.getUserContext(userName, true);

    //  if (!userFromStore && !userFromStore.isEnrolled()) {
    //    throw new Error('Failed to get user.... run register User')
    //  }
    const txId = fabricClient.newTransactionID();
    const proposalRequest = {
        chaincodeId: chaincodeName,
        fcn,
        args,
        chainId: channelName,
        txId,
    };
    const transactionProposalResult = await channel.sendTransactionProposal(
        proposalRequest,
    );
    const proposalResponses = transactionProposalResult[0];
    const proposal = transactionProposalResult[1];
    let endResult = [];
    if (
        proposalResponses &&
    proposalResponses[0].response &&
    proposalResponses[0].response.status === 200
    ) {
        const txRequest = {
            proposalResponses,
            proposal,
        };
        const transactionIDString = txId.getTransactionID();
        const promises = [];

        const sendPromise = await channel.sendTransaction(txRequest);
        promises.push(sendPromise);
        const eventHub = channel.newChannelEventHub(peer);
        const txPromise = new Promise((resolve, reject) => {
            eventHub.registerTxEvent(
                transactionIDString,
                (tx: any, code: string) => {
                    eventHub.unregisterTxEvent(transactionIDString);
                    const returnStatus = {
                        eventStatus: code,
                        txId: transactionIDString,
                    };
                    if (code !== 'VALID') {
                        reject(
                            new Error('Problem with the transaction, event status ::' + code),
                        );
                    } else {
                        resolve(returnStatus);
                    }
                },
                (err: string) => {
                    eventHub.unregisterTxEvent(transactionIDString);
                    reject(new Error('There was a problem with the eventhub ::' + err));
                },
                {
                    disconnect: true,
                },
            );
            if (!eventHub.isconnected()) {
                eventHub.connect();
            }
        });

        promises.push(txPromise);
        endResult = await Promise.all(promises);
    } else {
        throw new Error(
            `Transaction Failed To Complete Due To: ${proposalResponses}`,
        );
    }
    if (endResult && endResult[0] && endResult[0].status === 'SUCCESS') {
        try {
            const queryResult = await channel.queryTransaction(
                txId.getTransactionID(),
                peer,
            );
            returnValue.transaction = JSON.parse(
                queryResult.transactionEnvelope.payload.data.actions[0].payload.action
                    .proposal_response_payload.extension.response.payload,
            );
        } catch (err) {
            Sentry.captureException(err);
            throw new Error(`Failed to query transaction ${txId} due to: `);
        }
    } else {
        console.error(
            'Failed to order the transaction. Error code: ' + endResult[0].status,
        );
        throw new Error(
            'Failed to order the transaction. Error code: ' + endResult[0].status,
        );
    }

    if (endResult && endResult[1] && endResult[1].eventStatus === 'VALID') {
        returnValue.isValid = true;
        console.info('Successfully committed the change to the ledger by the peer');
    } else {
        console.info(
            'Transaction failed to be committed to the ledger due to ::' +
        endResult[1].event_status,
        );
    }
    return returnValue;
};
