export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          email: string | null
          has_paid: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          email?: string | null
          has_paid?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          email?: string | null
          has_paid?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          ticker: string
          type: string
          threshold: number | null
          direction: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          type: string
          threshold?: number | null
          direction?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          type?: string
          threshold?: number | null
          direction?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications_history: {
        Row: {
          id: string
          user_id: string
          ticker: string
          type: string
          triggered_at: string
          threshold: number | null
          direction: string | null
          value: number | null
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          type: string
          triggered_at?: string
          threshold?: number | null
          direction?: string | null
          value?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          type?: string
          triggered_at?: string
          threshold?: number | null
          direction?: string | null
          value?: number | null
        }
        Relationships: []
      }
      promocodes: {
        Row: {
          id: string
          code: string
          is_active: boolean
          max_redemptions: number | null
          redeemed_count: number
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          is_active?: boolean
          max_redemptions?: number | null
          redeemed_count?: number
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          is_active?: boolean
          max_redemptions?: number | null
          redeemed_count?: number
          expires_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      trend_data: {
        Row: {
          id: number
          ticker: string
          timestamp: string
          updated_at: string | null
          total_mentions: number
          bullish_mentions: number
          bearish_mentions: number
          neutral_mentions: number
          ai_score: number | null
          price: number | null
        }
        Insert: {
          id?: number
          ticker: string
          timestamp: string
          updated_at?: string | null
          total_mentions?: number
          bullish_mentions?: number
          bearish_mentions?: number
          neutral_mentions?: number
          ai_score?: number | null
          price?: number | null
        }
        Update: {
          id?: number
          ticker?: string
          timestamp?: string
          updated_at?: string | null
          total_mentions?: number
          bullish_mentions?: number
          bearish_mentions?: number
          neutral_mentions?: number
          ai_score?: number | null
          price?: number | null
        }
        Relationships: []
      }
      live_data: {
        Row: {
          id: number
          subreddit: string
          mentions: number
          timestamp: string
          created_at: string | null
          ticker: string
          text: string | null
          post_type: string
          link: string | null
        }
        Insert: {
          id?: number
          subreddit: string
          mentions?: number
          timestamp: string
          created_at?: string | null
          ticker: string
          text?: string | null
          post_type: string
          link?: string | null
        }
        Update: {
          id?: number
          subreddit?: string
          mentions?: number
          timestamp?: string
          created_at?: string | null
          ticker?: string
          text?: string | null
          post_type?: string
          link?: string | null
        }
        Relationships: []
      }
      summaries: {
        Row: {
          id: string
          ticker: string
          reddit_summary: string | null
          news_summary: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          ticker: string
          reddit_summary?: string | null
          news_summary?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          ticker?: string
          reddit_summary?: string | null
          news_summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tickers_whitelist: {
        Row: {
          id: string
          ticker: string
          created_at: string | null
        }
        Insert: {
          id?: string
          ticker: string
          created_at?: string | null
        }
        Update: {
          id?: string
          ticker?: string
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      redeem_promocode: {
        Args: {
          p_code: string
          p_user_id: string
          p_email: string
        }
        Returns: boolean
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
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
