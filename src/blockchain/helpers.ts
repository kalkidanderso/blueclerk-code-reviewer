import fs from 'fs';
import path from 'path';
import * as config from './config.json';
import * as Sentry from '@sentry/node';

export const getClientForOrg = async () => {
    const storePath = path.join(__dirname, 'hfc-key-store');
    const peerCert = '-----BEGIN CERTIFICATE-----\nMIIChjCCAiygAwIBAgIRAOUd5Ma/35DYpBp9WlFH298wCgYIKoZIzj0EAwIwgYwx\nCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1TYW4g\nRnJhbmNpc2NvMSQwIgYDVQQKExtibHVlY2xlcmsuYmx1ZWNsZXJrLWJjbi5jb20x\nKjAoBgNVBAMTIXRsc2NhLmJsdWVjbGVyay5ibHVlY2xlcmstYmNuLmNvbTAeFw0y\nMzAyMTMxNjEwMDBaFw0zMzAyMTAxNjEwMDBaMIGMMQswCQYDVQQGEwJVUzETMBEG\nA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZyYW5jaXNjbzEkMCIGA1UE\nChMbYmx1ZWNsZXJrLmJsdWVjbGVyay1iY24uY29tMSowKAYDVQQDEyF0bHNjYS5i\nbHVlY2xlcmsuYmx1ZWNsZXJrLWJjbi5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMB\nBwNCAATZ2KxEGBo0p0SooZSoH8Ft8kpmz/NXkFTuCPaIx6IgYvymGVeJhZmrOCdN\n03uIJg80qLJh4Z3pb2/H6oNpt0Pno20wazAOBgNVHQ8BAf8EBAMCAaYwHQYDVR0l\nBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMA8GA1UdEwEB/wQFMAMBAf8wKQYDVR0O\nBCIEIGQZDKHZpC/p8URZTwO7/ndRzQDyJarP+y8DXJe+kelyMAoGCCqGSM49BAMC\nA0gAMEUCIQDgmSGxvOiyd1E/wBJyue46W0ZYy36JyUJoqKcOcYFnjgIgRiuM6dhZ\nTaQi5BuArICd2809poaP+jJVOMGiwPfC7fY=\n-----END CERTIFICATE-----\n';
    const ordererCert = '-----BEGIN CERTIFICATE-----\nMIICWzCCAgGgAwIBAgIQJfXXNEOpi0jKtlIE8jn5ETAKBggqhkjOPQQDAjB4MQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEaMBgGA1UEChMRYmx1ZWNsZXJrLWJjbi5jb20xIDAeBgNVBAMTF3Rs\nc2NhLmJsdWVjbGVyay1iY24uY29tMB4XDTIzMDIxMzE2MTAwMFoXDTMzMDIxMDE2\nMTAwMFoweDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNV\nBAcTDVNhbiBGcmFuY2lzY28xGjAYBgNVBAoTEWJsdWVjbGVyay1iY24uY29tMSAw\nHgYDVQQDExd0bHNjYS5ibHVlY2xlcmstYmNuLmNvbTBZMBMGByqGSM49AgEGCCqG\nSM49AwEHA0IABNRZqkMNYjGy0dezo2vMkBdTiRLx/tQHprrRojV5+qBtkbio7bIw\nv1rXvx8rYl81ly7Fcw1mcV1BBUJXZuHE+kujbTBrMA4GA1UdDwEB/wQEAwIBpjAd\nBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwDwYDVR0TAQH/BAUwAwEB/zAp\nBgNVHQ4EIgQg+TiJkg7UpNeT1jnuD2LYsIzLeYfuMgePnsKenk7Se0UwCgYIKoZI\nzj0EAwIDSAAwRQIhAI14wEj3aPYwFwJaVvmTLYCvsWWZM02lOlTjC5D3xDgfAiAT\n80CUxTJMwRS7TFersv53P68xkMYP+re7a4Ki2lLCRA==\n-----END CERTIFICATE-----\n';
  
    //  try {
    //    peerCert = fs.readFileSync(path.join(__dirname, '/network/tls', config.tlsPeerCert)).toString();
    //    ordererCert = fs.readFileSync(path.join(__dirname, '/network/tls', config.tlsOrdererCert)).toString();
    //  } catch (err) {
    //    console.error(err);
    //    throw new Error('Failed to read Certificates from persistence error: ');
    //  }

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
        Sentry.captureException(err);
        console.error(err);
        throw new Error('Failed to read stateStore: ');
    }
};