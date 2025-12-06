export interface CashBalanceResponse {
  balance: number;
}

export interface UpdateCashBalanceRequest {
  status: boolean;
  value: number;
  description: string;
}

export interface HistoryBalanceItem {
  id: number;
  status: boolean;
  value: number;
  description: string;
  created_by: number;
  created_at: string;
  created_by_user?: import('./external-user.model').ExternalUserDetails | null;
}

export interface HistoryBalanceListResponse {
  items: HistoryBalanceItem[];
  next_cursor: number | null;
  has_more: boolean;
}
