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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      approved_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          age: number
          created_at: string | null
          id: string
          name: string
          school: string
          user_id: string
        }
        Insert: {
          age: number
          created_at?: string | null
          id?: string
          name: string
          school: string
          user_id: string
        }
        Update: {
          age?: number
          created_at?: string | null
          id?: string
          name?: string
          school?: string
          user_id?: string
        }
        Relationships: []
      }
      co_parent_links: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_parent_links_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_parent_links_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_id: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_link"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "account_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          car_make: string | null
          car_model: string | null
          car_seats: number | null
          created_at: string
          first_name: string | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          last_name: string | null
          phone_number: string | null
          updated_at: string
          username: string
        }
        Insert: {
          account_type: string
          car_make?: string | null
          car_model?: string | null
          car_seats?: number | null
          created_at?: string
          first_name?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          account_type?: string
          car_make?: string | null
          car_model?: string | null
          car_seats?: number | null
          created_at?: string
          first_name?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      ride_conversations: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          recipient_id: string
          ride_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          ride_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          ride_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_conversations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_conversations_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_conversations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string | null
          dropoff_location: string
          id: string
          is_recurring: boolean | null
          pickup_location: string
          recipient_id: string | null
          recurring_days: string[] | null
          ride_date: string
          ride_time: string
          route_details: string | null
          seats_available: number | null
          seats_needed: number | null
          status: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dropoff_location: string
          id?: string
          is_recurring?: boolean | null
          pickup_location: string
          recipient_id?: string | null
          recurring_days?: string[] | null
          ride_date: string
          ride_time: string
          route_details?: string | null
          seats_available?: number | null
          seats_needed?: number | null
          status?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dropoff_location?: string
          id?: string
          is_recurring?: boolean | null
          pickup_location?: string
          recipient_id?: string | null
          recurring_days?: string[] | null
          ride_date?: string
          ride_time?: string
          route_details?: string | null
          seats_available?: number | null
          seats_needed?: number | null
          status?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          school_type: string | null
          state: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          school_type?: string | null
          state: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          school_type?: string | null
          state?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      student_parent_links: {
        Row: {
          approved_at: string | null
          code_expires_at: string | null
          created_at: string | null
          id: string
          parent_id: string
          status: string
          student_id: string
          verification_code: string | null
        }
        Insert: {
          approved_at?: string | null
          code_expires_at?: string | null
          created_at?: string | null
          id?: string
          parent_id: string
          status?: string
          student_id: string
          verification_code?: string | null
        }
        Update: {
          approved_at?: string | null
          code_expires_at?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string
          status?: string
          student_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          failed_login_attempts: number
          first_name: string
          is_verified: boolean
          last_failed_login: string | null
          last_login: string | null
          last_name: string
          password_hash: string
          phone_number: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_login_attempts?: number
          first_name: string
          is_verified?: boolean
          last_failed_login?: string | null
          last_login?: string | null
          last_name: string
          password_hash: string
          phone_number?: string | null
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_login_attempts?: number
          first_name?: string
          is_verified?: boolean
          last_failed_login?: string | null
          last_login?: string | null
          last_name?: string
          password_hash?: string
          phone_number?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
        }
        Relationships: []
      }
      verified_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          verified_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_codes: { Args: never; Returns: undefined }
      get_linked_parents: {
        Args: { student_user_id: string }
        Returns: {
          linked_at: string
          parent_email: string
          parent_first_name: string
          parent_id: string
          parent_last_name: string
        }[]
      }
      get_linked_students: {
        Args: { parent_user_id: string }
        Returns: {
          linked_at: string
          student_email: string
          student_first_name: string
          student_id: string
          student_last_name: string
        }[]
      }
      get_user_email: { Args: { user_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_link_approved: {
        Args: { parent_user_id: string; student_user_id: string }
        Returns: boolean
      }
      is_student_email: { Args: { user_email: string }; Returns: boolean }
      is_valid_parent_email: { Args: { email: string }; Returns: boolean }
      is_valid_student_email: { Args: { email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "parent" | "staff" | "admin"
      transaction_type: "broadcast" | "direct"
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
      app_role: ["student", "parent", "staff", "admin"],
      transaction_type: ["broadcast", "direct"],
    },
  },
} as const
