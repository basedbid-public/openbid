export class BasedBidApi {
  static async invokeApi<T>(endpoint: string, payload: object) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(await response.text());

      throw new Error(
        `BasedBid API Error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as T;

    return json;
  }
}
