import { readFileSync } from 'fs';
import { IpfsUploadResponse } from 'interfaces/ipfs/upload-response';
import {
  getOpenBidApiHeaders,
  getSolanaApiFailureHint,
  printNextSteps,
} from './next-steps';

const summarizeUploadError = (status: number, errorBody: string) => {
  if (errorBody.includes('Error code 522')) {
    return `HTTP ${status}: cdn.based.bid timed out (Cloudflare 522)`;
  }

  if (errorBody.trim().startsWith('<!DOCTYPE html>')) {
    const title = errorBody.match(/<title>(.*?)<\/title>/i)?.[1];
    return `HTTP ${status}: ${title ?? 'HTML error response from cdn.based.bid'}`;
  }

  return `HTTP ${status}: ${errorBody}`;
};

const getIpfsUploadFailureHint = (status: number, errorBody: string) => {
  if (status === 522 || errorBody.includes('Error code 522')) {
    return [
      'cdn.based.bid timed out while uploading the image.',
      'Retry the same command in a minute.',
      'If it repeats, share the Cloudflare 522 timestamp and Ray ID with basedbid devs.',
    ];
  }

  return getSolanaApiFailureHint(errorBody);
};

const getFetchFailureMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Could not reach cdn.based.bid.';
  }

  const cause = error.cause;
  if (
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    cause.code === 'ENOTFOUND'
  ) {
    return 'Could not resolve cdn.based.bid. Check your network connection and retry.';
  }

  return `Could not reach cdn.based.bid: ${error.message}`;
};

export class IpfsUpload {
  static async uploadMetadata(params: object, apiKey?: string) {
    console.log('Uploading metadata to IPFS...');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getOpenBidApiHeaders(),
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    let response: Response;
    try {
      response = await fetch('https://cdn.based.bid/api/upload/json', {
        method: 'POST',
        body: JSON.stringify(params),
        headers,
      });
    } catch (error) {
      const message = getFetchFailureMessage(error);
      console.error(message);
      printNextSteps('What To Try Next', [
        'Check your internet connection and DNS.',
        'Retry the same command once cdn.based.bid is reachable.',
      ]);
      throw new Error(`IPFS Error - Failed to upload metadata: ${message}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const summary = summarizeUploadError(response.status, errorBody);
      console.error(summary);
      printNextSteps(
        'What To Try Next',
        getIpfsUploadFailureHint(response.status, errorBody),
      );
      throw new Error(`IPFS Error - Failed to upload metadata: ${summary}`);
    }

    const json = (await response.json()) as IpfsUploadResponse;

    console.log('Metadata uploaded:', json.response.url);
    return json.response.url;
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
    const headers: Record<string, string> = { ...getOpenBidApiHeaders() };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    let response: Response;
    try {
      response = await fetch('https://cdn.based.bid/api/upload', {
        method: 'POST',
        body: formData,
        headers,
      });
    } catch (error) {
      const message = getFetchFailureMessage(error);
      console.error(message);
      printNextSteps('What To Try Next', [
        'Check your internet connection and DNS.',
        'Retry the same command once cdn.based.bid is reachable.',
      ]);
      throw new Error(`IPFS Error - Failed to upload image: ${message}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const summary = summarizeUploadError(response.status, errorBody);
      console.error(summary);
      if (response.status === 413) {
        printNextSteps('What To Try Next', [
          'Compress the image to under 1MB.',
          'Save it as assets/logo.jpg and rerun the same command.',
        ]);
        throw new Error(
          `IPFS Error - Image file too large (max 1MB): ${summary}`,
        );
      }

      printNextSteps(
        'What To Try Next',
        getIpfsUploadFailureHint(response.status, errorBody),
      );
      throw new Error(`IPFS Error - Failed to upload image: ${summary}`);
    }

    const json = (await response.json()) as IpfsUploadResponse;

    console.log('Image uploaded:', json.response.url);

    return json.response.url;
  }
}
