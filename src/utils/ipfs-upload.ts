import { IpfsUploadType } from '@enums';
import { IpfsUploadApiResponse } from '@interfaces';
import { readFileSync } from 'fs';

export class IpfsUpload {
  static async uploadMetadata(params: object, apiKey?: string) {
    console.log('Uploading metadata to IPFS...');

    const url = await this._upload(
      IpfsUploadType.JSON,
      JSON.stringify(params),
      apiKey,
    );

    console.log('Metadata uploaded:', url);
    return url;
  }

  static async uploadImage(filePath: string, apiKey?: string): Promise<string> {
    console.log('Uploading image to IPFS...');

    const fileBuffer = readFileSync(filePath);
    const fileName = filePath.split('/').pop();
    if (!fileName) {
      throw new Error('IPFS Error - Image file not found');
    }

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    const url = await this._upload(IpfsUploadType.IMAGE, formData, apiKey);

    console.log('Image uploaded:', url);
    return url;
  }

  static async _upload(
    type: IpfsUploadType,
    body: string | FormData,
    apiKey?: string,
  ) {
    const headers = {
      ...(type === IpfsUploadType.JSON && {
        'Content-Type': 'application/json',
      }),
      ...(apiKey && { 'x-api-key': apiKey }),
    };

    const response = await fetch(
      `https://cdn.based.bid/api/upload/${type === IpfsUploadType.JSON ? 'json' : ''}`,
      {
        method: 'POST',
        body,
        headers,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(errorBody);

      switch (response.status) {
        case 401:
          throw new Error(`IPFS Error - Invalid API key provided`);
        case 403:
          throw new Error(
            `IPFS Error - API key does not match the board in the request`,
          );
        case 413:
          throw new Error(`IPFS Error - Upload too large (max 1MB)`);
        case 429:
          throw new Error(`IPFS Error - Rate Limit Exceeded, try again later`);
        default:
          throw new Error(`IPFS Error`);
      }
    }

    const json = (await response.json()) as IpfsUploadApiResponse;

    return json.response.url;
  }
}
