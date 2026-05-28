export interface CreateBoardSolanaApiResponse {
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
  txCost?: {
    currency: string;
    totalRequired: {
      lamports: string;
      sol: string;
    };
  };
}
