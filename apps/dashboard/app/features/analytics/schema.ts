export type AnalyticsDateRange = {
  start: string;
  end: string;
};

export type AnalyticsOverview = {
  views: number;
  uniqueVisitors: number;
  outboundClicks: number;
  leads: number;
  leadConversionRate: number;
  clickThroughRate: number;
  comparison: { views: number; uniqueVisitors: number; outboundClicks: number; leads: number };
  trend: Array<{ date: string; views: number; clicks: number; leads: number }>;
  destinations: Array<{ id: string; type: 'link' | 'content'; label: string; clicks: number }>;
  /** Top five sources by views. */
  acquisition: Array<{ source: string; views: number }>;
  /** Views from every source outside the top five, so the two sum to `views`. */
  acquisitionOther: number;
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
  leadSources: Array<{ source: string; leads: number }>;
  leadStatuses: Array<{ status: string; count: number }>;
};
