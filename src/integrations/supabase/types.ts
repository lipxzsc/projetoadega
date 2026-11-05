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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          credits: number
          id: string
          last_order_at: string | null
          name: string
          orders_count: number
          phone: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          last_order_at?: string | null
          name: string
          orders_count?: number
          phone: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          last_order_at?: string | null
          name?: string
          orders_count?: number
          phone?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          created_at: string
          email: string | null
          handled_at: string | null
          id: string
          kind: string
          message: string | null
          name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          handled_at?: string | null
          id?: string
          kind: string
          message?: string | null
          name: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          handled_at?: string | null
          id?: string
          kind?: string
          message?: string | null
          name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          success?: boolean
        }
        Relationships: []
      }
      motoboys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          combo_details: Json | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          combo_details?: Json | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          combo_details?: Json | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_city: string
          address_complement: string | null
          address_neighborhood: string
          address_number: string
          address_reference: string | null
          address_street: string
          age_confirmed_at: string | null
          change_for: number | null
          consent_version: string | null
          coupon_code: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          discount: number
          id: string
          latitude: number | null
          longitude: number | null
          motoboy_id: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          terms_accepted_at: string | null
          total: number
          updated_at: string
        }
        Insert: {
          address_city: string
          address_complement?: string | null
          address_neighborhood: string
          address_number: string
          address_reference?: string | null
          address_street: string
          age_confirmed_at?: string | null
          change_for?: number | null
          consent_version?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          discount?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          motoboy_id?: string | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          terms_accepted_at?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          address_city?: string
          address_complement?: string | null
          address_neighborhood?: string
          address_number?: string
          address_reference?: string | null
          address_street?: string
          age_confirmed_at?: string | null
          change_for?: number | null
          consent_version?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          discount?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          motoboy_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          terms_accepted_at?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_motoboy_id_fkey"
            columns: ["motoboy_id"]
            isOneToOne: false
            referencedRelation: "motoboys"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      store_hours: {
        Row: {
          closes_at: string
          id: string
          is_closed: boolean
          opens_at: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          cnpj: string | null
          contact_email: string | null
          delivery_fee: number
          dpo_email: string | null
          dpo_name: string | null
          id: number
          is_open: boolean
          legal_address: string | null
          legal_name: string | null
          store_name: string
          updated_at: string
          whatsapp_admin: string | null
        }
        Insert: {
          cnpj?: string | null
          contact_email?: string | null
          delivery_fee?: number
          dpo_email?: string | null
          dpo_name?: string | null
          id?: number
          is_open?: boolean
          legal_address?: string | null
          legal_name?: string | null
          store_name?: string
          updated_at?: string
          whatsapp_admin?: string | null
        }
        Update: {
          cnpj?: string | null
          contact_email?: string | null
          delivery_fee?: number
          dpo_email?: string | null
          dpo_name?: string | null
          id?: number
          is_open?: boolean
          legal_address?: string | null
          legal_name?: string | null
          store_name?: string
          updated_at?: string
          whatsapp_admin?: string | null
        }
        Relationships: []
      }
      store_whatsapp_numbers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          phone: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          phone: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          phone?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          read_by_store: boolean
          sender: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          read_by_store?: boolean
          sender: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          read_by_store?: boolean
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      store_settings_public: {
        Row: {
          cnpj: string | null
          contact_email: string | null
          delivery_fee: number | null
          dpo_email: string | null
          dpo_name: string | null
          id: number | null
          is_open: boolean | null
          legal_address: string | null
          legal_name: string | null
          store_name: string | null
          whatsapp_admin: string | null
        }
        Insert: {
          cnpj?: string | null
          contact_email?: string | null
          delivery_fee?: number | null
          dpo_email?: string | null
          dpo_name?: string | null
          id?: number | null
          is_open?: boolean | null
          legal_address?: string | null
          legal_name?: string | null
          store_name?: string | null
          whatsapp_admin?: string | null
        }
        Update: {
          cnpj?: string | null
          contact_email?: string | null
          delivery_fee?: number | null
          dpo_email?: string | null
          dpo_name?: string | null
          id?: number | null
          is_open?: boolean | null
          legal_address?: string | null
          legal_name?: string | null
          store_name?: string | null
          whatsapp_admin?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
      coupon_type: "percent" | "fixed" | "free_shipping" | "credit"
      order_status:
        | "recebido"
        | "preparando"
        | "pronto"
        | "saiu_entrega"
        | "entregue"
        | "cancelado"
      payment_method: "pix" | "cartao" | "dinheiro"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
      coupon_type: ["percent", "fixed", "free_shipping", "credit"],
      order_status: [
        "recebido",
        "preparando",
        "pronto",
        "saiu_entrega",
        "entregue",
        "cancelado",
      ],
      payment_method: ["pix", "cartao", "dinheiro"],
    },
  },
} as const
