export class BasedBidApi {
  static async invokeApi<T>(
    endpoint: string,
    payload: object,
    errorMessage: string,
  ) {
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
