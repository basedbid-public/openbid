import { IpfsUploadResponse } from '@interfaces/ipfs/upload-response';
import { readFileSync } from 'fs';

export class IpfsUpload {
  static async uploadMetadata(params: object) {
    const response = await fetch('https://cdn.based.bid/api/upload/json', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(await response.text());
      throw new Error('IPFS Error - Failed to upload metadata');
    }

    const json = (await response.json()) as IpfsUploadResponse;

    return json.response.url;
  }

  static async uploadImage(filePath: string): Promise<string> {
    const fileBuffer = readFileSync(filePath);
    const fileName = filePath.split('/').pop();
    if (!fileName) {
      throw new Error('IPFS Error - Image file not found');
    }
    const formData = new FormData();

    formData.append('file', new Blob([fileBuffer]), fileName);
    const response = await fetch('https://cdn.based.bid/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error(await response.text());
      if (response.status === 413) {
        throw new Error('IPFS Error - Image file too large (max 1MB)');
      }

      throw new Error('IPFS Error - Failed to upload image');
    }

    const json = (await response.json()) as IpfsUploadResponse;
    return json.response.url;
  }
}
