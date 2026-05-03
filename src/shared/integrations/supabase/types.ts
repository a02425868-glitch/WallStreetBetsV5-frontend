export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          user_id: string;
          email: string | null;
          has_paid: boolean;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          user_id: string;
          email?: string | null;
          has_paid?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
      notifications: TableDefinition<
        {
          id: string;
          user_id: string;
          ticker: string;
          type: string;
          threshold: number | null;
          direction: string;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          ticker: string;
          type: string;
          threshold?: number | null;
          direction?: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
      notifications_history: TableDefinition<
        {
          id: string;
          user_id: string;
          notification_id: string | null;
          ticker: string;
          type: string;
          triggered_at: string;
          threshold: number | null;
          direction: string | null;
          triggered_value: number | null;
        },
        {
          id?: string;
          user_id: string;
          notification_id?: string | null;
          ticker: string;
          type: string;
          triggered_at?: string;
          threshold?: number | null;
          direction?: string | null;
          triggered_value?: number | null;
        }
      >;
      promocodes: TableDefinition<
        {
          id: string;
          code: string;
          is_active: boolean;
          max_redemptions: number | null;
          redeemed_count: number;
          expires_at: string | null;
          created_at: string | null;
        },
        {
          id?: string;
          code: string;
          is_active?: boolean;
          max_redemptions?: number | null;
          redeemed_count?: number;
          expires_at?: string | null;
          created_at?: string | null;
        }
      >;
      tickers_whitelist: TableDefinition<
        {
          id: string;
          ticker: string;
          company_name: string | null;
          sector: string | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          id?: string;
          ticker: string;
          company_name?: string | null;
          sector?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      redeem_promocode: {
        Args: {
          p_code: string;
          p_user_id: string;
          p_email: string;
        };
        Returns: boolean;
      };
      tracked_tickers: {
        Args: { p_limit?: number };
        Returns: {
          ticker: string;
          recent_mentions_24h: number | null;
          last_met_at: string | null;
          last_met_reason: string | null;
          updated_at_utc: string | null;
        }[];
      };
      tracked_leaderboard: {
        Args: { p_limit?: number };
        Returns: {
          ticker: string;
          mentions_1h: number | null;
          mentions_12h: number | null;
          mentions_24h: number | null;
          mentions_48h: number | null;
          mentions_7d: number | null;
          mentions_30d: number | null;
          bullish_mentions_24h: number | null;
          bearish_mentions_24h: number | null;
          sentiment_ratio_24h: number | null;
          latest_ai_score: number | null;
          latest_price: number | null;
          price_change_pct_1h: number | null;
          price_change_pct_12h: number | null;
          price_change_pct_24h: number | null;
          price_change_pct_7d: number | null;
          price_change_pct_30d: number | null;
          updated_at_utc: string | null;
        }[];
      };
      get_trends_metrics: {
        Args: {
          p_tickers: string[];
          p_interval?: string;
          p_lookback_hours?: number;
          p_session_mode?: string;
        };
        Returns: {
          ticker: string;
          bucket_start_utc: string;
          total_mentions: number | null;
          bullish_mentions: number | null;
          bearish_mentions: number | null;
          neutral_mentions: number | null;
          unclassified_mentions: number | null;
          ai_score: number | null;
          price: number | null;
        }[];
      };
      get_ticker_detail_overview: {
        Args: { p_ticker: string };
        Returns: {
          ticker: string;
          latest_price: number | null;
          latest_price_timestamp_utc: string | null;
          latest_ai_score: number | null;
          latest_ai_timestamp_utc: string | null;
          mentions_24h: number | null;
          bullish_mentions_24h: number | null;
          bearish_mentions_24h: number | null;
          neutral_mentions_24h: number | null;
          unclassified_mentions_24h: number | null;
          latest_reddit_summary: string | null;
          latest_reddit_summary_timestamp_utc: string | null;
          latest_news_summary: string | null;
          latest_news_summary_timestamp_utc: string | null;
          updated_at_utc: string | null;
        }[];
      };
      get_live_reddit_feed: {
        Args: { p_limit?: number; p_ticker?: string | null };
        Returns: {
          mention_id: string;
          ticker: string;
          object_uid: string;
          object_type: string;
          subreddit: string;
          reddit_id: string;
          parent_id: string | null;
          author: string | null;
          title: string | null;
          body: string | null;
          created_utc: string;
          permalink: string | null;
          url: string | null;
          score: number | null;
          sentiment_label: string;
          sentiment_confidence: number | null;
          model_name: string;
          model_version: string;
          rationale: string | null;
          classified_at_utc: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
