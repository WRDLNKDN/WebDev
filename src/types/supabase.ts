export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_allowlist: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          display_name: string | null
          handle: string
          tagline: string | null
          avatar: string | null
          status: string
          nerd_creds: Json | null
          email: string
          pronouns: string | null
          socials: Json
          join_reason: string[] | null
          participation_style: string[] | null
          additional_context: string | null
          geek_creds: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          is_admin: boolean
          created_at: string
          resume_url: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          display_name?: string | null
          handle: string
          tagline?: string | null
          avatar?: string | null
          status?: string
          nerd_creds?: Json | null
          email: string
          pronouns?: string | null
          socials?: Json
          join_reason?: string[] | null
          participation_style?: string[] | null
          additional_context?: string | null
          geek_creds?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          is_admin?: boolean
          created_at?: string
          resume_url?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          display_name?: string | null
          handle?: string
          tagline?: string | null
          avatar?: string | null
          status?: string
          nerd_creds?: Json | null
          email?: string
          pronouns?: string | null
          socials?: Json
          join_reason?: string[] | null
          participation_style?: string[] | null
          additional_context?: string | null
          geek_creds?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          is_admin?: boolean
          created_at?: string
          resume_url?: string | null
        }
      }
      portfolio_items: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          image_url: string | null
          project_url: string | null
          tech_stack: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          image_url?: string | null
          project_url?: string | null
          tech_stack?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          project_url?: string | null
          tech_stack?: string[] | null
          created_at?: string
        }
      }
    }
  }
}
