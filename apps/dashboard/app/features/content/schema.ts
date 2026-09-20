export type ContentItem = {
  id: string;
  connectedAccountId: string;
  provider: string;
  kind: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
  importedAt: string;
};
