
export type NavigationTab = 'landing' | 'dashboard' | 'marketplace' | 'referrals' | 'profile';

export interface Asset {
  id: string;
  name: string;
  description: string;
  minInvestment: string;
  volatility?: string;
  yield?: string;
  status: 'open' | 'locked' | 'soon';
  image: string;
  tags: string[];
  performance: string;
  risk: 'Low' | 'Moderate' | 'High';
}

export interface PortfolioItem {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  icon: string;
  iconColor: string;
}

export interface Referral {
  id: string;
  name: string;
  status: 'active' | 'pending';
  date: string;
  commission: string;
}
