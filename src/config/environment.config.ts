import { Networks, rpc } from "@stellar/stellar-sdk";

function getNetworkConfig(serverUrl: string): {
  [key: string]: {
    server: rpc.Server;
    networkPassphrase: string;
  };
} {
  return {
    testnet: {
      server: new rpc.Server(serverUrl, { allowHttp: true }),
      networkPassphrase: Networks.TESTNET,
    },
    public: {
      server: new rpc.Server(serverUrl, { allowHttp: true }),
      networkPassphrase: Networks.PUBLIC,
    },
    futurenet: {
      server: new rpc.Server(serverUrl, { allowHttp: true }),
      networkPassphrase: Networks.FUTURENET,
    },
  };
}

export default getNetworkConfig;
