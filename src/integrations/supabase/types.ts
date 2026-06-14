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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link?: string | null
          title?: string
        }
        Relationships: []
      }
      cashback_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          net_loss: number
          pct: number
          tier_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          net_loss: number
          pct: number
          tier_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          net_loss?: number
          pct?: number
          tier_id?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_methods: {
        Row: {
          account_number: string
          account_title: string
          api_config: Json | null
          api_endpoint: string | null
          api_key: string | null
          id: string
          instructions: string | null
          is_active: boolean
          method_name: string
          method_type: string
          qr_image: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          account_title: string
          api_config?: Json | null
          api_endpoint?: string | null
          api_key?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          method_name: string
          method_type?: string
          qr_image?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_title?: string
          api_config?: Json | null
          api_endpoint?: string | null
          api_key?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          method_name?: string
          method_type?: string
          qr_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          transaction_id: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          transaction_id: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          auto_draw: boolean
          created_at: string
          description: string | null
          ends_at: string
          entry_fee: number
          featured: boolean
          filled_slots: number
          gallery: string[] | null
          id: string
          prize_image: string | null
          prize_value: number
          starts_at: string
          status: Database["public"]["Enums"]["game_status"]
          title: string
          total_slots: number
          winner_count: number
        }
        Insert: {
          auto_draw?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string
          entry_fee?: number
          featured?: boolean
          filled_slots?: number
          gallery?: string[] | null
          id?: string
          prize_image?: string | null
          prize_value?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["game_status"]
          title: string
          total_slots?: number
          winner_count?: number
        }
        Update: {
          auto_draw?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string
          entry_fee?: number
          featured?: boolean
          filled_slots?: number
          gallery?: string[] | null
          id?: string
          prize_image?: string | null
          prize_value?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["game_status"]
          title?: string
          total_slots?: number
          winner_count?: number
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          body: string | null
          config: Json | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          link_label: string | null
          link_url: string | null
          position: number
          section_key: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          position?: number
          section_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          position?: number
          section_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          admin_notes: string | null
          cnic_back_url: string
          cnic_front_url: string
          cnic_number: string
          created_at: string
          full_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["kyc_status"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cnic_back_url: string
          cnic_front_url: string
          cnic_number: string
          created_at?: string
          full_name: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["kyc_status"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cnic_back_url?: string
          cnic_front_url?: string
          cnic_number?: string
          created_at?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          referral_code: string
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward?: number | null
        }
        Relationships: []
      }
      responsible_gaming_limits: {
        Row: {
          daily_spend_limit: number | null
          self_excluded_until: string | null
          updated_at: string
          user_id: string
          weekly_spend_limit: number | null
        }
        Insert: {
          daily_spend_limit?: number | null
          self_excluded_until?: string | null
          updated_at?: string
          user_id: string
          weekly_spend_limit?: number | null
        }
        Update: {
          daily_spend_limit?: number | null
          self_excluded_until?: string | null
          updated_at?: string
          user_id?: string
          weekly_spend_limit?: number | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_admin: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          last_message_at: string
          priority: Database["public"]["Enums"]["support_priority"]
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string
          game_id: string
          id: string
          ticket_no: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          ticket_no?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          ticket_no?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          best_streak: number
          last_claim_at: string | null
          streak: number
          total_claimed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          best_streak?: number
          last_claim_at?: string | null
          streak?: number
          total_claimed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          best_streak?: number
          last_claim_at?: string | null
          streak?: number
          total_claimed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_tiers: {
        Row: {
          cashback_pct: number
          color: string
          icon: string
          id: string
          min_spend: number
          name: string
          perks: Json
          sort_order: number
        }
        Insert: {
          cashback_pct?: number
          color?: string
          icon?: string
          id: string
          min_spend?: number
          name: string
          perks?: Json
          sort_order?: number
        }
        Update: {
          cashback_pct?: number
          color?: string
          icon?: string
          id?: string
          min_spend?: number
          name?: string
          perks?: Json
          sort_order?: number
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          created_at: string
          game_id: string
          id: string
          notify_until: string | null
          prize_value: number | null
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          notify_until?: string | null
          prize_value?: number | null
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          notify_until?: string | null
          prize_value?: number | null
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_number: string
          account_title: string
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          account_number: string
          account_title: string
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          account_number?: string
          account_title?: string
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      deposit_methods_public: {
        Row: {
          account_number: string | null
          account_title: string | null
          id: string | null
          instructions: string | null
          is_active: boolean | null
          method_name: string | null
          method_type: string | null
          qr_image: string | null
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          id?: string | null
          instructions?: string | null
          is_active?: boolean | null
          method_name?: string | null
          method_type?: string | null
          qr_image?: string | null
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          id?: string | null
          instructions?: string | null
          is_active?: boolean | null
          method_name?: string | null
          method_type?: string | null
          qr_image?: string | null
        }
        Relationships: []
      }
      user_vip: {
        Row: {
          lifetime_spend: number | null
          tier_id: string | null
          user_id: string | null
        }
        Insert: {
          lifetime_spend?: never
          tier_id?: never
          user_id?: string | null
        }
        Update: {
          lifetime_spend?: never
          tier_id?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_daily_spin: { Args: never; Returns: Json }
      claim_weekly_cashback: { Args: never; Returns: Json }
      process_withdrawal: {
        Args: { p_approve: boolean; p_id: string; p_notes?: string }
        Returns: Json
      }
      purchase_ticket: {
        Args: { p_game_id: string; p_qty: number }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_method: string
          p_number: string
          p_title: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      deposit_status: "pending" | "approved" | "rejected"
      game_status: "upcoming" | "live" | "completed" | "cancelled"
      kyc_status: "pending" | "approved" | "rejected"
      support_priority: "low" | "normal" | "high" | "urgent"
      support_status: "open" | "pending" | "resolved" | "closed"
      txn_type: "credit" | "debit"
      withdrawal_status: "pending" | "approved" | "rejected"
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
      deposit_status: ["pending", "approved", "rejected"],
      game_status: ["upcoming", "live", "completed", "cancelled"],
      kyc_status: ["pending", "approved", "rejected"],
      support_priority: ["low", "normal", "high", "urgent"],
      support_status: ["open", "pending", "resolved", "closed"],
      txn_type: ["credit", "debit"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
