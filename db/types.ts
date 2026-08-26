export interface Gojol {
  id: number;
  title: string;
  artist?: string;
  category: string;
  content: string;
  is_favorite: number; // 0 for false, 1 for true in SQLite
  created_at: string; // ISO 8601 string or timestamp
}

export interface GojolInput {
  title: string;
  artist?: string;
  category: string;
  content: string;
}
