export interface ImportDuesMonthCell {
  month: number;
  status: 'paid' | 'unpaid';
  amount?: number;
}

export interface ImportDuesRow {
  member_id: number;
  member_name: string;
  months: ImportDuesMonthCell[];
}

export interface ImportDuesChange {
  member_id: number;
  period_year: number;
  period_month: number;
  action: 'create' | 'delete' | 'skip';
  amount: number;
  reason?: string;
}

export interface ImportDuesReportItem {
  member_id: number;
  member_name: string;
  processed: number;
  success: number;
  failed: number;
  errors: string[];
  changes: ImportDuesChange[];
}

export interface ImportDuesSummary {
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
}

export interface ImportDuesResult {
  summary: ImportDuesSummary;
  items: ImportDuesReportItem[];
}

