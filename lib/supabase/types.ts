/**
 * Tipos de la base de datos de LABDEX.
 *
 * En fases posteriores este archivo se generará automáticamente con:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * Por ahora se define a mano, cubriendo únicamente la Fase 1.
 */
export type AppRole = "user" | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}
