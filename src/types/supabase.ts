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
        Relationships: []
      }
      feed_advertisers: {
        Row: {
          id: string
          company_name: string
          title: string
          description: string
          url: string
          logo_url: string | null
          image_url: string | null
          links: Json
          active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          title: string
          description: string
          url: string
          logo_url?: string | null
          image_url?: string | null
          links?: Json
          active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          title?: string
          description?: string
          url?: string
          logo_url?: string | null
          image_url?: string | null
          links?: Json
          active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_connections: {
        Row: {
          user_id: string
          connected_user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          connected_user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          connected_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          id: string
          user_id: string
          kind: string
          payload: Json
          parent_id: string | null
          created_at: string
          scheduled_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          payload?: Json
          parent_id?: string | null
          created_at?: string
          scheduled_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          payload?: Json
          parent_id?: string | null
          created_at?: string
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          }
        ]
      }
      portfolio_items: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          project_url: string | null
          image_url: string | null
          tech_stack: string[] | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          project_url?: string | null
          image_url?: string | null
          tech_stack?: string[] | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          project_url?: string | null
          image_url?: string | null
          tech_stack?: string[] | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_blocks: {
        Row: {
          blocker_id: string
          blocked_user_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_user_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_suspensions: {
        Row: {
          id: string
          user_id: string
          suspended_by: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          suspended_by: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          suspended_by?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          id: string
          room_type: string
          name: string | null
          created_by: string
          original_admin_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_type: string
          name?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_type?: string
          name?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_room_members: {
        Row: {
          room_id: string
          user_id: string
          role: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          room_id: string
          user_id: string
          role?: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          room_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          left_at?: string | null
        }
        Relationships: []
      }
      chat_reports: {
        Row: {
          id: string
          reporter_id: string
          reported_message_id: string | null
          reported_user_id: string | null
          category: string
          free_text: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_message_id?: string | null
          reported_user_id?: string | null
          category: string
          free_text?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_message_id?: string | null
          reported_user_id?: string | null
          category?: string
          free_text?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_message_attachments: {
        Row: {
          id: string
          message_id: string
          storage_path: string
          mime_type: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          storage_path: string
          mime_type: string
          file_size: number
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          storage_path?: string
          mime_type?: string
          file_size?: number
          created_at?: string
        }
        Relationships: []
      }
      chat_read_receipts: {
        Row: {
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          message_id?: string
          user_id?: string
          read_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          room_id: string
          sender_id: string | null
          content: string | null
          is_system_message: boolean
          is_deleted: boolean
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          sender_id?: string | null
          content?: string | null
          is_system_message?: boolean
          is_deleted?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          sender_id?: string | null
          content?: string | null
          is_system_message?: boolean
          is_deleted?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          host_id: string
          title: string
          description: string | null
          start_at: string
          end_at: string | null
          location: string | null
          location_type: string | null
          link_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          host_id: string
          title: string
          description?: string | null
          start_at: string
          end_at?: string | null
          location?: string | null
          location_type?: string | null
          link_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          title?: string
          description?: string | null
          start_at?: string
          end_at?: string | null
          location?: string | null
          location_type?: string | null
          link_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          type: string
          reference_id: string | null
          reference_type: string | null
          payload: Json
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          type: string
          reference_id?: string | null
          reference_type?: string | null
          payload?: Json
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          type?: string
          reference_id?: string | null
          reference_type?: string | null
          payload?: Json
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          id: string
          requester_id: string
          recipient_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          recipient_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          recipient_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          handle: string
          email: string
          display_name: string | null
          tagline: string | null
          avatar: string | null
          resume_url: string | null
          pronouns: string | null
          industry: string | null
          location: string | null
          profile_visibility: string
          feed_view_preference: string
          marketing_opt_in: boolean
          marketing_opt_in_timestamp: string | null
          marketing_opt_in_ip: string | null
          marketing_source: string | null
          marketing_product_updates: boolean
          marketing_events: boolean
          last_active_at: string | null
          status: string
          socials: Json | null
          nerd_creds: Json | null
          geek_creds: string[] | null
          join_reason: string[] | null
          participation_style: string[] | null
          additional_context: string | null
          policy_version: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
          use_weirdling_avatar: boolean
        }
        Insert: {
          id: string
          handle: string
          email: string
          display_name?: string | null
          tagline?: string | null
          avatar?: string | null
          resume_url?: string | null
          pronouns?: string | null
          industry?: string | null
          location?: string | null
          profile_visibility?: string
          feed_view_preference?: string
          marketing_opt_in?: boolean
          marketing_opt_in_timestamp?: string | null
          marketing_opt_in_ip?: string | null
          marketing_source?: string | null
          marketing_product_updates?: boolean
          marketing_events?: boolean
          last_active_at?: string | null
          status?: string
          use_weirdling_avatar?: boolean
          socials?: Json | null
          nerd_creds?: Json | null
          geek_creds?: string[] | null
          join_reason?: string[] | null
          participation_style?: string[] | null
          additional_context?: string | null
          policy_version?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          handle?: string
          email?: string
          display_name?: string | null
          tagline?: string | null
          avatar?: string | null
          resume_url?: string | null
          pronouns?: string | null
          industry?: string | null
          location?: string | null
          profile_visibility?: string
          feed_view_preference?: string
          marketing_opt_in?: boolean
          marketing_opt_in_timestamp?: string | null
          marketing_opt_in_ip?: string | null
          marketing_source?: string | null
          marketing_product_updates?: boolean
          marketing_events?: boolean
          last_active_at?: string | null
          status?: string
          socials?: Json | null
          nerd_creds?: Json | null
          geek_creds?: string[] | null
          join_reason?: string[] | null
          participation_style?: string[] | null
          additional_context?: string | null
          policy_version?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
          use_weirdling_avatar?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      are_chat_connections: {
        Args: { a: string; b: string }
        Returns: boolean
      }
      chat_blocked: {
        Args: { a: string; b: string }
        Returns: boolean
      }
      is_chat_moderator: {
        Args: Record<string, never>
        Returns: boolean
      }
      chat_create_group: {
        Args: { p_name: string; p_member_ids: string[] }
        Returns: string
      }
      chat_room_summaries: {
        Args: { p_room_ids: string[]; p_user_id: string }
        Returns: {
          room_id: string
          last_content: string | null
          last_created_at: string
          last_is_deleted: boolean
          unread_count: number
        }[]
      }
      chat_prune_audit_log: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never
