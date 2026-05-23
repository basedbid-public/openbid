export interface CreateBoardSolanaResponse {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  transaction: string;
  boardId: string;
  boardTitle: string;
  metadataUrl?: string;
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
}
