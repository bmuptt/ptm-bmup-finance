export interface CashBalanceRepositoryInterface {
  getCurrentBalance(): Promise<number>;
  updateBalance(payload: { status: boolean; value: number; description: string }, userId: number): Promise<number>;
  getHistoryBalance(params: { cursor?: number; limit: number }): Promise<{
    items: {
      id: number;
      status: boolean;
      value: number;
      description: string;
      created_by: number;
      created_at: string;
    }[];
    nextCursor: number | null;
    hasMore: boolean;
  }>;
}
