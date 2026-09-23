export type ClientType = "IP" | "TOO";
export type DataSource = "live" | "snapshot";
export interface LeaseModel {
  id: number;
  brand: string;
  name: string;
  partnerId: number;
  partnerName: string;
}
export interface LeaseRate {
  modelId: number;
  months: number;
  advancePercent: number;
  annualRate: number;
  rateId: number;
}
export interface PriceLimit {
  advancePercent: number;
  minPrice: number;
  maxPrice: number;
}
export interface CatalogData {
  models: LeaseModel[];
  years: number[];
  source: DataSource;
  checkedAt: string;
}
export interface TermsData {
  rates: LeaseRate[];
  limits: PriceLimit[];
  source: DataSource;
  checkedAt: string;
}
export interface Quote {
  price: number;
  rate: LeaseRate;
  advanceAmount: number;
  principal: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayments: number;
  totalWithAdvance: number;
}
export interface ScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}
