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
      balances: {
        Row: {
          base_eth_fee_balance: number
          demo_usdt_balance: number
          id: string
          kdx_balance: number
          kdx_claimable: number
          oil_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_eth_fee_balance?: number
          demo_usdt_balance?: number
          id?: string
          kdx_balance?: number
          kdx_claimable?: number
          oil_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_eth_fee_balance?: number
          demo_usdt_balance?: number
          id?: string
          kdx_balance?: number
          kdx_claimable?: number
          oil_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bonus_claims: {
        Row: {
          amount_oil: number
          bonus_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount_oil?: number
          bonus_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_oil?: number
          bonus_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_rewards_snapshot: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          is_claimed: boolean
          reward_amount: number
          reward_date: string
          total_pool_volume: number
          user_id: string
          volume_score: number
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          reward_amount?: number
          reward_date: string
          total_pool_volume?: number
          user_id: string
          volume_score?: number
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          reward_amount?: number
          reward_date?: string
          total_pool_volume?: number
          user_id?: string
          volume_score?: number
        }
        Relationships: []
      }
      deposits_history: {
        Row: {
          amount: number
          chain_id: number
          confirmed_at: string | null
          created_at: string
          id: string
          status: string
          token: string
          tx_hash: string
          user_id: string
        }
        Insert: {
          amount: number
          chain_id?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          token?: string
          tx_hash: string
          user_id: string
        }
        Update: {
          amount?: number
          chain_id?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          token?: string
          tx_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_daily: {
        Row: {
          date: string
          id: string
          total_counted_volume: number
          total_pnl: number
          total_volume: number
          trade_count: number
          updated_at: string
          user_id: string
          win_count: number
        }
        Insert: {
          date?: string
          id?: string
          total_counted_volume?: number
          total_pnl?: number
          total_volume?: number
          trade_count?: number
          updated_at?: string
          user_id: string
          win_count?: number
        }
        Update: {
          date?: string
          id?: string
          total_counted_volume?: number
          total_pnl?: number
          total_volume?: number
          trade_count?: number
          updated_at?: string
          user_id?: string
          win_count?: number
        }
        Relationships: []
      }
      oil_deposits: {
        Row: {
          confirmed_at: string | null
          created_at: string
          eth_amount: number
          id: string
          oil_credited: number
          status: string
          tx_hash: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          eth_amount: number
          id?: string
          oil_credited: number
          status?: string
          tx_hash: string
          user_id: string
          wallet_address: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          eth_amount?: number
          id?: string
          oil_credited?: number
          status?: string
          tx_hash?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      open_positions: {
        Row: {
          entry_price: number
          entry_price_executed: number | null
          fee_paid: number
          id: string
          leverage: number
          liquidation_price: number
          margin: number
          opened_at: string
          position_size: number
          side: string
          slippage_rate: number
          symbol: string
          user_id: string
        }
        Insert: {
          entry_price: number
          entry_price_executed?: number | null
          fee_paid?: number
          id?: string
          leverage: number
          liquidation_price: number
          margin: number
          opened_at?: string
          position_size: number
          side: string
          slippage_rate?: number
          symbol: string
          user_id: string
        }
        Update: {
          entry_price?: number
          entry_price_executed?: number | null
          fee_paid?: number
          id?: string
          leverage?: number
          liquidation_price?: number
          margin?: number
          opened_at?: string
          position_size?: number
          side?: string
          slippage_rate?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          linked_wallet_address: string | null
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          linked_wallet_address?: string | null
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          linked_wallet_address?: string | null
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      referral_bonus_history: {
        Row: {
          claim_id: string
          claimed_amount: number
          created_at: string
          id: string
          referral_bonus_amount: number
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          claim_id: string
          claimed_amount: number
          created_at?: string
          id?: string
          referral_bonus_amount: number
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          claim_id?: string
          claimed_amount?: number
          created_at?: string
          id?: string
          referral_bonus_amount?: number
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          bonus_granted: boolean
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          bonus_granted?: boolean
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          bonus_granted?: boolean
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      rewards_claims: {
        Row: {
          amount: number
          claim_date: string
          claimed_at: string
          id: string
          user_id: string
          volume_score: number
          wallet_address: string | null
        }
        Insert: {
          amount: number
          claim_date?: string
          claimed_at?: string
          id?: string
          user_id: string
          volume_score?: number
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          claim_date?: string
          claimed_at?: string
          id?: string
          user_id?: string
          volume_score?: number
          wallet_address?: string | null
        }
        Relationships: []
      }
      social_tasks_progress: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          created_at: string
          id: string
          proof_type: string
          proof_value: string
          status: string
          task_id: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          proof_type: string
          proof_value: string
          status?: string
          task_id: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          proof_type?: string
          proof_value?: string
          status?: string
          task_id?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      tasks_progress: {
        Row: {
          claimed: boolean
          completed: boolean
          date: string
          id: string
          progress: number
          target: number
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          date?: string
          id?: string
          progress?: number
          target: number
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          date?: string
          id?: string
          progress?: number
          target?: number
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades_history: {
        Row: {
          closed_at: string
          counted_volume: number | null
          counted_volume_reason: string | null
          entry_price: number
          entry_price_executed: number | null
          exit_price: number | null
          exit_price_executed: number | null
          fee_paid: number
          id: string
          leverage: number
          margin: number
          open_time_seconds: number | null
          opened_at: string
          position_size: number
          realized_pnl: number | null
          side: string
          slippage_rate: number
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          closed_at?: string
          counted_volume?: number | null
          counted_volume_reason?: string | null
          entry_price: number
          entry_price_executed?: number | null
          exit_price?: number | null
          exit_price_executed?: number | null
          fee_paid?: number
          id?: string
          leverage: number
          margin: number
          open_time_seconds?: number | null
          opened_at: string
          position_size: number
          realized_pnl?: number | null
          side: string
          slippage_rate?: number
          status: string
          symbol: string
          user_id: string
        }
        Update: {
          closed_at?: string
          counted_volume?: number | null
          counted_volume_reason?: string | null
          entry_price?: number
          entry_price_executed?: number | null
          exit_price?: number | null
          exit_price_executed?: number | null
          fee_paid?: number
          id?: string
          leverage?: number
          margin?: number
          open_time_seconds?: number | null
          opened_at?: string
          position_size?: number
          realized_pnl?: number | null
          side?: string
          slippage_rate?: number
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volume_milestone_claims: {
        Row: {
          claimed_at: string
          date: string
          id: string
          milestone_id: string
          reward_oil: number
          user_id: string
          volume_reached: number
        }
        Insert: {
          claimed_at?: string
          date?: string
          id?: string
          milestone_id: string
          reward_oil: number
          user_id: string
          volume_reached: number
        }
        Update: {
          claimed_at?: string
          date?: string
          id?: string
          milestone_id?: string
          reward_oil?: number
          user_id?: string
          volume_reached?: number
        }
        Relationships: []
      }
      wallet_connections: {
        Row: {
          chain_id: number
          connected_at: string
          id: string
          is_primary: boolean
          user_id: string
          wallet_address: string
        }
        Insert: {
          chain_id?: number
          connected_at?: string
          id?: string
          is_primary?: boolean
          user_id: string
          wallet_address: string
        }
        Update: {
          chain_id?: number
          connected_at?: string
          id?: string
          is_primary?: boolean
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_referrer_by_code: {
        Args: { code: string }
        Returns: {
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
