import { ApiType } from 'enums';
import { getSolanaApiFailureHint, printNextSteps } from './next-steps';

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

  static basedTradeUrl(isSandboxMode: boolean) {
    return isSandboxMode ? 'https://tt.based.bid' : `https://trade.based.bid`;
  }

  static async invokeApi<T>(
    apiType: ApiType,
    path: string,
    payload: object,
    errorMessage: string,
    isSandboxMode: boolean,
    apiKey?: string,
  ) {
    const apiUrl =
      apiType === ApiType.SDK
        ? this.sdkApiUrl(isSandboxMode)
        : this.platformApiUrl(isSandboxMode);
    const endpoint = `${apiUrl}/${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'x-api-key': apiKey }),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
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
