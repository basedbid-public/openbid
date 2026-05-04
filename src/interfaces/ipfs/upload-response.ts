export interface IpfsUploadResponse {
  ok: boolean;
  response: {
    cid: string;
    url: string;
  };
}
