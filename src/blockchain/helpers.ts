import fs from 'fs';
import path from 'path';
import * as config from './config.json';

export const getClientForOrg = async () => {
  const storePath = path.join(__dirname, 'hfc-key-store');
  let peerCert = '';
  let ordererCert = '';
  try {
    peerCert = fs.readFileSync(path.join(__dirname, '/network/tls', config.tlsPeerCert)).toString();
    ordererCert = fs.readFileSync(path.join(__dirname, '/network/tls', config.tlsOrdererCert)).toString();
  } catch (err) {
    console.error(err);
    throw new Error('Failed to read Certificates from persistence error: ');
  }

  const FabricClient = require('fabric-client');
  const fabricClient = new FabricClient();
  const regChannel = fabricClient.newChannel(config.channelName);
  const peer = fabricClient.newPeer(config.peerRequestUrl, {
    pem: peerCert,
    'ssl-target-name-override': config.peer
  });
  const order = fabricClient.newOrderer(config.networkOrdererUrl, {
    pem: ordererCert,
    'ssl-target-name-override': config.orderer
  });
  regChannel.addOrderer(order);
  regChannel.addPeer(peer);
  try {
    const stateStore = await FabricClient.newDefaultKeyValueStore({
      path: storePath
    });
    fabricClient.setStateStore(stateStore);
    const cryptoSuite = FabricClient.newCryptoSuite();
    const cryptoStore = FabricClient.newCryptoKeyStore({
      path: storePath
    });
    cryptoSuite.setCryptoKeyStore(cryptoStore);
    fabricClient.setCryptoSuite(cryptoSuite);
    return {
      fabricClient,
      peer
    };
  } catch (err) {
    console.error(err);
  }
};