// Type definitions for SNSHACK Client Insight Dashboard

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DASHBOARD_PASSWORD: string;
  CSV_STORAGE: R2Bucket;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  SENDGRID_API_KEY?: string;
}

export type Variables = {
  authenticated: boolean;
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  client_id: string;
  platform: string;
  url: string;
  posted_at: string;
  created_at: string;
  updated_at: string;
}

export interface MetricsSnapshot {
  id: string;
  content_id: string;
  snapshot_date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  profile_views: number;
  website_clicks: number;
  avg_watch_sec: number;
  completion_rate: number;
  vcr: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyGoal {
  id: string;
  client_id: string;
  target_month: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  created_at: string;
  updated_at: string;
}

export interface CSVUpload {
  id: string;
  client_id: string;
  file_name: string;
  file_size: number;
  r2_key: string;
  uploaded_by: string | null;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export interface CSVColumnMapping {
  id: string;
  client_id: string;
  mapping_name: string;
  column_mapping: Record<string, string>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
