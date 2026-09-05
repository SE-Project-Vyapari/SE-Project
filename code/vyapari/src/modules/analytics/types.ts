export type DateRangePreset = '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'custom';

export interface AnalyticsFilterState {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  outletId: string;  // 'all' or outlet id
  categoryId: string; // 'all' or category name
  productId: string; // 'all' or product id
  comparePrior: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface ComparisonDateRanges {
  current: DateRange;
  prior: DateRange;
  durationDays: number;
}
