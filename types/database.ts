/**
 * Supabase database types.
 *
 * Generate the real version with:
 *   npx supabase gen types typescript --project-id <your-project-id> > types/database.ts
 *
 * Until then this stub keeps TypeScript happy.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
