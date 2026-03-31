export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_users: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["account_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["account_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["account_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          broker_name: string | null
          created_at: string
          currency: string | null
          id: string
          name: string
          starting_balance: number | null
          status: Database["public"]["Enums"]["account_status"] | null
          type: Database["public"]["Enums"]["account_type"] | null
          updated_at: string
        }
        Insert: {
          broker_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string
          starting_balance?: number | null
          status?: Database["public"]["Enums"]["account_status"] | null
          type?: Database["public"]["Enums"]["account_type"] | null
          updated_at?: string
        }
        Update: {
          broker_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string
          starting_balance?: number | null
          status?: Database["public"]["Enums"]["account_status"] | null
          type?: Database["public"]["Enums"]["account_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      backtests: {
        Row: {
          account_id: string | null
          created_at: string
          date: string | null
          day_of_week: string | null
          entry_time: string | null
          folder_id: string | null
          has_news: boolean | null
          id: string
          images: string[] | null
          losses: number
          name: string
          net_pnl: number | null
          news_events: Json | null
          news_impact: string | null
          notes: string | null
          profit_factor: number | null
          session: string | null
          sort_order: number | null
          strategy: string | null
          symbol: string | null
          timeframe: string | null
          total_trades: number | null
          updated_at: string
          user_id: string
          win_rate: number | null
          wins: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          date?: string | null
          day_of_week?: string | null
          entry_time?: string | null
          folder_id?: string | null
          has_news?: boolean | null
          id?: string
          images?: string[] | null
          losses?: number
          name: string
          net_pnl?: number | null
          news_events?: Json | null
          news_impact?: string | null
          notes?: string | null
          profit_factor?: number | null
          session?: string | null
          sort_order?: number | null
          strategy?: string | null
          symbol?: string | null
          timeframe?: string | null
          total_trades?: number | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
          wins?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          date?: string | null
          day_of_week?: string | null
          entry_time?: string | null
          folder_id?: string | null
          has_news?: boolean | null
          id?: string
          images?: string[] | null
          losses?: number
          name?: string
          net_pnl?: number | null
          news_events?: Json | null
          news_impact?: string | null
          notes?: string | null
          profit_factor?: number | null
          session?: string | null
          sort_order?: number | null
          strategy?: string | null
          symbol?: string | null
          timeframe?: string | null
          total_trades?: number | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "backtests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtests_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          account_id: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      morning_forecasts: {
        Row: {
          created_at: string
          date: string
          direction: string | null
          forecast: string | null
          forecast_time: string | null
          forecast_type: string | null
          id: string
          images: string[] | null
          outcome: string | null
          status: string | null
          symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          direction?: string | null
          forecast?: string | null
          forecast_time?: string | null
          forecast_type?: string | null
          id?: string
          images?: string[] | null
          outcome?: string | null
          status?: string | null
          symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          direction?: string | null
          forecast?: string | null
          forecast_time?: string | null
          forecast_type?: string | null
          id?: string
          images?: string[] | null
          outcome?: string | null
          status?: string | null
          symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playbook_setups: {
        Row: {
          account_id: string | null
          category: string | null
          created_at: string
          date: string | null
          day_of_week: string | null
          description: string | null
          entry_criteria: string | null
          entry_time: string | null
          exit_criteria: string | null
          folder_id: string | null
          has_news: boolean | null
          id: string
          images: string[] | null
          is_favorite: boolean | null
          losses: number
          name: string
          news_events: Json | null
          news_impact: string | null
          notes: string | null
          risk_reward: string | null
          session: string | null
          sort_order: number | null
          symbol: string | null
          timeframe: string | null
          updated_at: string
          user_id: string
          win_rate: number | null
          wins: number
        }
        Insert: {
          account_id?: string | null
          category?: string | null
          created_at?: string
          date?: string | null
          day_of_week?: string | null
          description?: string | null
          entry_criteria?: string | null
          entry_time?: string | null
          exit_criteria?: string | null
          folder_id?: string | null
          has_news?: boolean | null
          id?: string
          images?: string[] | null
          is_favorite?: boolean | null
          losses?: number
          name: string
          news_events?: Json | null
          news_impact?: string | null
          notes?: string | null
          risk_reward?: string | null
          session?: string | null
          sort_order?: number | null
          symbol?: string | null
          timeframe?: string | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
          wins?: number
        }
        Update: {
          account_id?: string | null
          category?: string | null
          created_at?: string
          date?: string | null
          day_of_week?: string | null
          description?: string | null
          entry_criteria?: string | null
          entry_time?: string | null
          exit_criteria?: string | null
          folder_id?: string | null
          has_news?: boolean | null
          id?: string
          images?: string[] | null
          is_favorite?: boolean | null
          losses?: number
          name?: string
          news_events?: Json | null
          news_impact?: string | null
          notes?: string | null
          risk_reward?: string | null
          session?: string | null
          sort_order?: number | null
          symbol?: string | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_setups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_setups_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          account_balance: number | null
          avatar_url: string | null
          background_type: string | null
          background_value: string | null
          balance_hidden: boolean | null
          color_preset_id: string | null
          created_at: string
          currency: string | null
          custom_colors: Json | null
          daily_goal: number | null
          has_logged_in_before: boolean
          id: string
          liquid_glass_enabled: boolean | null
          monthly_goal: number | null
          news_filters: Json | null
          saved_presets: Json | null
          selected_account_id: string | null
          selected_timeframes: Json | null
          theme: string | null
          trading_rules: Json | null
          updated_at: string
          user_id: string
          username: string | null
          weekly_goal: number | null
          welcome_message: string | null
          yearly_goal: number | null
        }
        Insert: {
          accent_color?: string | null
          account_balance?: number | null
          avatar_url?: string | null
          background_type?: string | null
          background_value?: string | null
          balance_hidden?: boolean | null
          color_preset_id?: string | null
          created_at?: string
          currency?: string | null
          custom_colors?: Json | null
          daily_goal?: number | null
          has_logged_in_before?: boolean
          id?: string
          liquid_glass_enabled?: boolean | null
          monthly_goal?: number | null
          news_filters?: Json | null
          saved_presets?: Json | null
          selected_account_id?: string | null
          selected_timeframes?: Json | null
          theme?: string | null
          trading_rules?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
          weekly_goal?: number | null
          welcome_message?: string | null
          yearly_goal?: number | null
        }
        Update: {
          accent_color?: string | null
          account_balance?: number | null
          avatar_url?: string | null
          background_type?: string | null
          background_value?: string | null
          balance_hidden?: boolean | null
          color_preset_id?: string | null
          created_at?: string
          currency?: string | null
          custom_colors?: Json | null
          daily_goal?: number | null
          has_logged_in_before?: boolean
          id?: string
          liquid_glass_enabled?: boolean | null
          monthly_goal?: number | null
          news_filters?: Json | null
          saved_presets?: Json | null
          selected_account_id?: string | null
          selected_timeframes?: Json | null
          theme?: string | null
          trading_rules?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
          weekly_goal?: number | null
          welcome_message?: string | null
          yearly_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_account_id_fkey"
            columns: ["selected_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_id: string | null
          broken_rules: string[] | null
          category: string | null
          chart_analysis_notes: string | null
          created_at: string
          date: string
          direction: string
          emotional_journal_after: string | null
          emotional_journal_before: string | null
          emotional_journal_during: string | null
          emotional_state: number | null
          entry_price: number
          entry_time: string
          followed_rules: boolean | null
          followed_rules_list: string[] | null
          forecast_id: string | null
          has_news: boolean | null
          holding_time: string
          id: string
          images: string[] | null
          is_paper_trade: boolean | null
          lot_size: number
          news_events: Json | null
          news_impact: string | null
          news_time: string | null
          news_type: string | null
          no_trade_taken: boolean | null
          notes: string | null
          overall_emotions: string | null
          performance_grade: number
          pnl_amount: number
          pnl_percentage: number
          post_market_images: string[] | null
          post_market_notes: string | null
          post_market_review: string | null
          pre_market_images: string[] | null
          pre_market_notes: string | null
          pre_market_plan: string | null
          risk_reward_ratio: string
          status: string | null
          stop_loss: number
          stop_loss_pips: number | null
          strategy: string | null
          symbol: string
          take_profit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broken_rules?: string[] | null
          category?: string | null
          chart_analysis_notes?: string | null
          created_at?: string
          date: string
          direction: string
          emotional_journal_after?: string | null
          emotional_journal_before?: string | null
          emotional_journal_during?: string | null
          emotional_state?: number | null
          entry_price: number
          entry_time: string
          followed_rules?: boolean | null
          followed_rules_list?: string[] | null
          forecast_id?: string | null
          has_news?: boolean | null
          holding_time: string
          id?: string
          images?: string[] | null
          is_paper_trade?: boolean | null
          lot_size: number
          news_events?: Json | null
          news_impact?: string | null
          news_time?: string | null
          news_type?: string | null
          no_trade_taken?: boolean | null
          notes?: string | null
          overall_emotions?: string | null
          performance_grade: number
          pnl_amount: number
          pnl_percentage: number
          post_market_images?: string[] | null
          post_market_notes?: string | null
          post_market_review?: string | null
          pre_market_images?: string[] | null
          pre_market_notes?: string | null
          pre_market_plan?: string | null
          risk_reward_ratio: string
          status?: string | null
          stop_loss: number
          stop_loss_pips?: number | null
          strategy?: string | null
          symbol: string
          take_profit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          broken_rules?: string[] | null
          category?: string | null
          chart_analysis_notes?: string | null
          created_at?: string
          date?: string
          direction?: string
          emotional_journal_after?: string | null
          emotional_journal_before?: string | null
          emotional_journal_during?: string | null
          emotional_state?: number | null
          entry_price?: number
          entry_time?: string
          followed_rules?: boolean | null
          followed_rules_list?: string[] | null
          forecast_id?: string | null
          has_news?: boolean | null
          holding_time?: string
          id?: string
          images?: string[] | null
          is_paper_trade?: boolean | null
          lot_size?: number
          news_events?: Json | null
          news_impact?: string | null
          news_time?: string | null
          news_type?: string | null
          no_trade_taken?: boolean | null
          notes?: string | null
          overall_emotions?: string | null
          performance_grade?: number
          pnl_amount?: number
          pnl_percentage?: number
          post_market_images?: string[] | null
          post_market_notes?: string | null
          post_market_review?: string | null
          pre_market_images?: string[] | null
          pre_market_notes?: string | null
          pre_market_plan?: string | null
          risk_reward_ratio?: string
          status?: string | null
          stop_loss?: number
          stop_loss_pips?: number | null
          strategy?: string | null
          symbol?: string
          take_profit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "morning_forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_account_for_user: {
        Args: {
          _broker_name?: string
          _currency?: string
          _name: string
          _starting_balance?: number
          _type?: Database["public"]["Enums"]["account_type"]
        }
        Returns: string
      }
      get_user_account_ids: { Args: { _user_id: string }; Returns: string[] }
      has_account_role: {
        Args: {
          _account_id: string
          _role: Database["public"]["Enums"]["account_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_member: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_role: "owner" | "admin" | "member"
      account_status: "active" | "archived"
      account_type: "prop_firm" | "personal" | "funded" | "demo"
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
    Enums: {
      account_role: ["owner", "admin", "member"],
      account_status: ["active", "archived"],
      account_type: ["prop_firm", "personal", "funded", "demo"],
    },
  },
} as const
