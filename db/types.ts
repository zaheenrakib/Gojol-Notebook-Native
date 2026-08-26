export interface Gojol {
  id: number;
  title: string;
  artist?: string;
  category: string;
  content: string;
  is_favorite: number; // 0 for false, 1 for true in SQLite
  is_approved: number; // 0 for pending, 1 for approved in SQLite
  created_at: string; // ISO 8601 string or timestamp
}

export interface GojolInput {
  title: string;
  artist?: string;
  category: string;
  content: string;
}
