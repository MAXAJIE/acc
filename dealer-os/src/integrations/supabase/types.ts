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
      agents: {
        Row: {
          commission_percent: number | null
          consent_ack_date: string | null
          created_at: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          joined_date: string
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_percent?: number | null
          consent_ack_date?: string | null
          created_at?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          joined_date?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_percent?: number | null
          consent_ack_date?: string | null
          created_at?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          joined_date?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          aging_alert_days: number
          currency: string
          default_commission_percent: number
          id: number
          updated_at: string
        }
        Insert: {
          aging_alert_days?: number
          currency?: string
          default_commission_percent?: number
          id?: number
          updated_at?: string
        }
        Update: {
          aging_alert_days?: number
          currency?: string
          default_commission_percent?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      commission_ledger: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          entry_date: string
          id: string
          transaction_id: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          entry_date?: string
          id?: string
          transaction_id: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          agent_id: string
          commission_amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          dealer_confirmed: boolean
          id: string
          notes: string | null
          sale_date: string
          sale_price: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          agent_id: string
          commission_amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          dealer_confirmed?: boolean
          id?: string
          notes?: string | null
          sale_date?: string
          sale_price: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          agent_id?: string
          commission_amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          dealer_confirmed?: boolean
          id?: string
          notes?: string | null
          sale_date?: string
          sale_price?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "public_vehicle_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicles: {
        Row: {
          amount_financed: number
          asking_price: number
          color: string | null
          condition_grade: string | null
          condition_summary: string | null
          created_at: string
          drawdown_date: string | null
          engine_no: string | null
          financing_type: Database["public"]["Enums"]["financing_type"]
          fuel: string | null
          id: string
          make: string
          mileage_km: number | null
          model: string
          photos: string[]
          public_link_id: string | null
          purchase_cost: number
          puspakom_date: string | null
          puspakom_status: string | null
          rate: number
          recon_cost: number
          sale_date: string | null
          sale_price: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          stocked_at: string
          transmission: string | null
          updated_at: string
          variant: string | null
          vin: string | null
          year: number
        }
        Insert: {
          amount_financed?: number
          asking_price?: number
          color?: string | null
          condition_grade?: string | null
          condition_summary?: string | null
          created_at?: string
          drawdown_date?: string | null
          engine_no?: string | null
          financing_type?: Database["public"]["Enums"]["financing_type"]
          fuel?: string | null
          id?: string
          make: string
          mileage_km?: number | null
          model: string
          photos?: string[]
          public_link_id?: string | null
          purchase_cost?: number
          puspakom_date?: string | null
          puspakom_status?: string | null
          rate?: number
          recon_cost?: number
          sale_date?: string | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          stocked_at?: string
          transmission?: string | null
          updated_at?: string
          variant?: string | null
          vin?: string | null
          year: number
        }
        Update: {
          amount_financed?: number
          asking_price?: number
          color?: string | null
          condition_grade?: string | null
          condition_summary?: string | null
          created_at?: string
          drawdown_date?: string | null
          engine_no?: string | null
          financing_type?: Database["public"]["Enums"]["financing_type"]
          fuel?: string | null
          id?: string
          make?: string
          mileage_km?: number | null
          model?: string
          photos?: string[]
          public_link_id?: string | null
          purchase_cost?: number
          puspakom_date?: string | null
          puspakom_status?: string | null
          rate?: number
          recon_cost?: number
          sale_date?: string | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          stocked_at?: string
          transmission?: string | null
          updated_at?: string
          variant?: string | null
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_vehicle_view: {
        Row: {
          asking_price: number | null
          color: string | null
          condition_summary: string | null
          fuel: string | null
          id: string | null
          make: string | null
          mileage_km: number | null
          model: string | null
          photos: string[] | null
          public_link_id: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          transmission: string | null
          variant: string | null
          year: number | null
        }
        Insert: {
          asking_price?: number | null
          color?: string | null
          condition_summary?: string | null
          fuel?: string | null
          id?: string | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          photos?: string[] | null
          public_link_id?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          transmission?: string | null
          variant?: string | null
          year?: number | null
        }
        Update: {
          asking_price?: number | null
          color?: string | null
          condition_summary?: string | null
          fuel?: string | null
          id?: string | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          photos?: string[] | null
          public_link_id?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          transmission?: string | null
          variant?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "dealer_admin" | "agent"
      employment_type: "employee" | "independent"
      financing_type: "cash" | "financed"
      vehicle_status: "in_stock" | "reserved" | "sold"
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
      app_role: ["dealer_admin", "agent"],
      employment_type: ["employee", "independent"],
      financing_type: ["cash", "financed"],
      vehicle_status: ["in_stock", "reserved", "sold"],
    },
  },
} as const
