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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          ad_platform: string | null
          city_resolved: string | null
          created_at: string
          cta_clicks: number | null
          device_type: string | null
          form_submissions: number | null
          id: string
          landing_page_id: string
          location_source: string | null
          page_views: number | null
          unique_visitors: number | null
        }
        Insert: {
          ad_platform?: string | null
          city_resolved?: string | null
          created_at?: string
          cta_clicks?: number | null
          device_type?: string | null
          form_submissions?: number | null
          id?: string
          landing_page_id: string
          location_source?: string | null
          page_views?: number | null
          unique_visitors?: number | null
        }
        Update: {
          ad_platform?: string | null
          city_resolved?: string | null
          created_at?: string
          cta_clicks?: number | null
          device_type?: string | null
          form_submissions?: number | null
          id?: string
          landing_page_id?: string
          location_source?: string | null
          page_views?: number | null
          unique_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      bing_geo_lookup: {
        Row: {
          area_code: string
          city: string
          country: string
          created_at: string
          google_criteria_id: string
          location_id: string
          state: string
          state_abbr: string
        }
        Insert: {
          area_code?: string
          city: string
          country: string
          created_at?: string
          google_criteria_id?: string
          location_id: string
          state: string
          state_abbr: string
        }
        Update: {
          area_code?: string
          city?: string
          country?: string
          created_at?: string
          google_criteria_id?: string
          location_id?: string
          state?: string
          state_abbr?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          active: boolean | null
          business_name: string
          country: string
          created_at: string
          default_address: string | null
          default_area_code: string | null
          default_city: string | null
          default_state: string | null
          email: string | null
          has_toll_free: boolean | null
          id: string
          notes: string | null
          phone: string | null
          service_verticals: string[] | null
          subscription_tier: string | null
          website_url: string | null
        }
        Insert: {
          active?: boolean | null
          business_name: string
          country?: string
          created_at?: string
          default_address?: string | null
          default_area_code?: string | null
          default_city?: string | null
          default_state?: string | null
          email?: string | null
          has_toll_free?: boolean | null
          id?: string
          notes?: string | null
          phone?: string | null
          service_verticals?: string[] | null
          subscription_tier?: string | null
          website_url?: string | null
        }
        Update: {
          active?: boolean | null
          business_name?: string
          country?: string
          created_at?: string
          default_address?: string | null
          default_area_code?: string | null
          default_city?: string | null
          default_state?: string | null
          email?: string | null
          has_toll_free?: boolean | null
          id?: string
          notes?: string | null
          phone?: string | null
          service_verticals?: string[] | null
          subscription_tier?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      edit_requests: {
        Row: {
          admin_notes: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          edit_description: string
          id: string
          landing_page_id: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          edit_description: string
          id?: string
          landing_page_id?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          edit_description?: string
          id?: string
          landing_page_id?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edit_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_configs: {
        Row: {
          adgroup_param: string | null
          campaign_param: string | null
          created_at: string
          id: string
          keyword_param: string | null
          landing_page_id: string
          loc_interest_param: string | null
          loc_physical_param: string | null
          priority_1: string | null
          priority_2: string | null
          priority_3: string | null
          use_adgroup_as_city: boolean | null
        }
        Insert: {
          adgroup_param?: string | null
          campaign_param?: string | null
          created_at?: string
          id?: string
          keyword_param?: string | null
          landing_page_id: string
          loc_interest_param?: string | null
          loc_physical_param?: string | null
          priority_1?: string | null
          priority_2?: string | null
          priority_3?: string | null
          use_adgroup_as_city?: boolean | null
        }
        Update: {
          adgroup_param?: string | null
          campaign_param?: string | null
          created_at?: string
          id?: string
          keyword_param?: string | null
          landing_page_id?: string
          loc_interest_param?: string | null
          loc_physical_param?: string | null
          priority_1?: string | null
          priority_2?: string | null
          priority_3?: string | null
          use_adgroup_as_city?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "geo_configs_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      google_geo_lookup: {
        Row: {
          area_code: string
          city: string
          country: string
          created_at: string
          criteria_id: string
          state: string
          state_abbr: string
        }
        Insert: {
          area_code?: string
          city: string
          country: string
          created_at?: string
          criteria_id: string
          state: string
          state_abbr: string
        }
        Update: {
          area_code?: string
          city?: string
          country?: string
          created_at?: string
          criteria_id?: string
          state?: string
          state_abbr?: string
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          bing_ads_url: string | null
          client_id: string
          country: string
          created_at: string
          cta_text: string | null
          deployed: boolean | null
          google_ads_url: string | null
          headline_template: string | null
          id: string
          page_name: string
          page_views: number | null
          phone_template: string | null
          primary_color: string | null
          subdomain: string | null
          subheadline_template: string | null
          template_type: string | null
        }
        Insert: {
          bing_ads_url?: string | null
          client_id: string
          country?: string
          created_at?: string
          cta_text?: string | null
          deployed?: boolean | null
          google_ads_url?: string | null
          headline_template?: string | null
          id?: string
          page_name: string
          page_views?: number | null
          phone_template?: string | null
          primary_color?: string | null
          subdomain?: string | null
          subheadline_template?: string | null
          template_type?: string | null
        }
        Update: {
          bing_ads_url?: string | null
          client_id?: string
          country?: string
          created_at?: string
          cta_text?: string | null
          deployed?: boolean | null
          google_ads_url?: string | null
          headline_template?: string | null
          id?: string
          page_name?: string
          page_views?: number | null
          phone_template?: string | null
          primary_color?: string | null
          subdomain?: string | null
          subheadline_template?: string | null
          template_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          active: boolean | null
          area_code: string
          call_tracking_enabled: boolean | null
          call_tracking_number: string | null
          call_tracking_provider: string | null
          client_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          is_toll_free: boolean | null
          label: string | null
          phone_number: string
        }
        Insert: {
          active?: boolean | null
          area_code: string
          call_tracking_enabled?: boolean | null
          call_tracking_number?: string | null
          call_tracking_provider?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_toll_free?: boolean | null
          label?: string | null
          phone_number: string
        }
        Update: {
          active?: boolean | null
          area_code?: string
          call_tracking_enabled?: boolean | null
          call_tracking_number?: string | null
          call_tracking_provider?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          is_toll_free?: boolean | null
          label?: string | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancelled_at: string | null
          client_id: string
          countries: string[]
          created_at: string
          id: string
          monthly_amount: number | null
          next_billing_date: string | null
          plan_tier: string | null
          setup_fee_amount: number | null
          setup_fee_paid: boolean | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          cancelled_at?: string | null
          client_id: string
          countries?: string[]
          created_at?: string
          id?: string
          monthly_amount?: number | null
          next_billing_date?: string | null
          plan_tier?: string | null
          setup_fee_amount?: number | null
          setup_fee_paid?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          cancelled_at?: string | null
          client_id?: string
          countries?: string[]
          created_at?: string
          id?: string
          monthly_amount?: number | null
          next_billing_date?: string | null
          plan_tier?: string | null
          setup_fee_amount?: number | null
          setup_fee_paid?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          active: boolean | null
          created_at: string
          default_cta: string | null
          default_headline: string | null
          default_primary_color: string | null
          default_subheadline: string | null
          html_structure: string | null
          id: string
          is_premium: boolean | null
          template_name: string
          thumbnail_url: string | null
          vertical: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          default_cta?: string | null
          default_headline?: string | null
          default_primary_color?: string | null
          default_subheadline?: string | null
          html_structure?: string | null
          id?: string
          is_premium?: boolean | null
          template_name: string
          thumbnail_url?: string | null
          vertical?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          default_cta?: string | null
          default_headline?: string | null
          default_primary_color?: string | null
          default_subheadline?: string | null
          html_structure?: string | null
          id?: string
          is_premium?: boolean | null
          template_name?: string
          thumbnail_url?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      us_area_codes: {
        Row: {
          area_code: string
          city: string
          id: string
          state: string
        }
        Insert: {
          area_code: string
          city: string
          id?: string
          state: string
        }
        Update: {
          area_code?: string
          city?: string
          id?: string
          state?: string
        }
        Relationships: []
      }
      us_state_area_codes: {
        Row: {
          area_code: string
          state: string
        }
        Insert: {
          area_code: string
          state: string
        }
        Update: {
          area_code?: string
          state?: string
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_client_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
