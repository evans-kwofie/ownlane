export type AnalyticsDateRange = {
  start: string;
  end: string;
};

export type AnalyticsOverview = {
  views: number;
  uniqueVisitors: number;
  outboundClicks: number;
  clickThroughRate: number;
  comparison: { views: number; uniqueVisitors: number; outboundClicks: number };
  trend: Array<{ date: string; views: number; clicks: number }>;
  destinations: Array<{ id: string; type: 'link' | 'content'; label: string; clicks: number }>;
  acquisition: Array<{ source: string; views: number }>;
  countries: Array<{ country: string; views: number }>;
  devices: Array<{ device: 'desktop' | 'mobile' | 'tablet' | 'unknown'; views: number }>;
  campaigns: Array<{
    source: string;
    medium: string;
    campaign: string;
    views: number;
    clicks: number;
  }>;
  interactions: Array<{ type: string; count: number }>;
};
