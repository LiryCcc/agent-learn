export type WebSearchProvider = 'tavily' | 'brave' | 'exa' | 'serpapi';

export type WebSearchFetch = typeof globalThis.fetch;

type BaseSearchConfig = {
  apiKey: string;
  baseUrl?: string;
  fetch?: WebSearchFetch;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type TavilySearchConfig = BaseSearchConfig & {
  provider: 'tavily';
  searchDepth?: 'advanced' | 'basic' | 'fast' | 'ultra-fast';
  topic?: 'finance' | 'general' | 'news';
  includeDomains?: readonly string[];
  excludeDomains?: readonly string[];
  country?: string;
};

export type BraveSearchConfig = BaseSearchConfig & {
  provider: 'brave';
  country?: string;
  searchLanguage?: string;
  uiLanguage?: string;
  safeSearch?: 'off' | 'moderate' | 'strict';
  freshness?: 'pd' | 'pw' | 'pm' | 'py' | string;
  extraSnippets?: boolean;
};

export type ExaSearchConfig = BaseSearchConfig & {
  provider: 'exa';
  searchType?: 'auto' | 'deep' | 'deep-lite' | 'deep-reasoning' | 'fast' | 'instant';
  category?: 'company' | 'financial report' | 'news' | 'people' | 'personal site' | 'research paper';
  includeDomains?: readonly string[];
  excludeDomains?: readonly string[];
  userLocation?: string;
  moderation?: boolean;
};

export type SerpApiSearchConfig = BaseSearchConfig & {
  provider: 'serpapi';
  engine?: string;
  location?: string;
  country?: string;
  language?: string;
  safeSearch?: 'active' | 'off';
};

export type WebSearchConfig = TavilySearchConfig | BraveSearchConfig | ExaSearchConfig | SerpApiSearchConfig;
