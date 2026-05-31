export interface IpfsUploadApiResponse {
  ok: boolean;
  response: {
    cid: string;
    url: string;
  };
}
