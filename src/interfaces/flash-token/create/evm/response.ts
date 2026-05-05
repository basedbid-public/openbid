export interface CreateFlashTokenEvmResponse {
  ok: boolean;
  functionName:
    | 'simpleFlashLaunchV3'
    | 'customFlashLaunchV3'
    | 'customFlashLaunchV4';
  address: `0x${string}`;
  args: [string, string, string, string, string, string, string];
  value: string;
  chain: {
    id: number;
    name: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: {
      default: {
        http: string[];
      };
    };
    blockExplorers: {
      default: {
        name: string;
        url: string;
        apiUrl: string;
        hash: string;
        address: string;
      };
    };
  };
  warnings: string[];
}
