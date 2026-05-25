import { ApiType } from 'enums';

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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(await response.json());

      throw new Error(
        `BasedBid API Error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as T;

    if (!json) {
      throw new Error(
        `Based Bid API Error: ${errorMessage ?? 'Unknown error'}`,
      );
    }

    return json;
  }
}
