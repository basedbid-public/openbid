import { ApiType } from 'enums';
import {
  getOpenBidApiHeaders,
  getSolanaApiFailureHint,
  printNextSteps,
} from './next-steps';

export class BasedBidApi {
  static sdkApiUrl(isSandboxMode: boolean) {
    return isSandboxMode
      ? 'https://cdn.based.bid/api'
      : `https://static.based.bid/api`;
  }

  static platformApiUrl(isSandboxMode: boolean) {
    return isSandboxMode
      ? 'https://testnet.based.bid/api'
      : `https://based.bid/api`;
  }

  static async invokeApi<T>(
    apiType: ApiType,
    path: string,
    payload: object,
    errorMessage: string,
    isSandboxMode: boolean,
  ) {
    const apiUrl =
      apiType === ApiType.SDK
        ? this.sdkApiUrl(isSandboxMode)
        : this.platformApiUrl(isSandboxMode);
    const endpoint = `${apiUrl}/${path}`;

    if (process.env.OPENBID_DEBUG_PAYLOADS === 'true') {
      console.log('\nbasedbid API payload');
      console.log('----------------------------------------');
      console.log(`Endpoint: ${endpoint}`);
      console.log(JSON.stringify(payload, null, 2));
      console.log('');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getOpenBidApiHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`basedbid API request failed: ${endpoint}`);
      console.error(errorBody);
      printNextSteps('What To Try Next', getSolanaApiFailureHint(errorBody));

      throw new Error(
        `basedbid API Error: ${response.status} ${response.statusText}: ${errorBody}`,
      );
    }

    const json = (await response.json()) as T;

    if (!json) {
      throw new Error(`basedbid API Error: ${errorMessage ?? 'Unknown error'}`);
    }

    return json;
  }
}
