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
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: number
          name: string
          name_enc: string | null
          name_hash: string | null
          name_iv: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: number
          name: string
          name_enc?: string | null
          name_hash?: string | null
          name_iv?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: number
          name?: string
          name_enc?: string | null
          name_hash?: string | null
          name_iv?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoros: {
        Row: {
          created_at: string
          duration: number
          elapsed: number
          ended_at: string | null
          id: number
          paused_at: string | null
          started_at: string
          task_id: number | null
          task_name: string
          task_name_enc: string | null
          task_name_iv: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration: number
          elapsed?: number
          ended_at?: string | null
          id?: number
          paused_at?: string | null
          started_at?: string
          task_id?: number | null
          task_name?: string
          task_name_enc?: string | null
          task_name_iv?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          elapsed?: number
          ended_at?: string | null
          id?: number
          paused_at?: string | null
          started_at?: string
          task_id?: number | null
          task_name?: string
          task_name_enc?: string | null
          task_name_iv?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoros_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pomodoros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          dek_iv: string | null
          dek_iv_backup: string | null
          encrypted_dek: string | null
          encrypted_dek_backup: string | null
          id: string
          kdf_iterations: number
          max_filter_selections: number
          notification_type: string | null
          pomodoro_time: number | null
          salt: string | null
          salt_backup: string | null
          theme: string | null
          username: string
          view: string | null
        }
        Insert: {
          created_at?: string | null
          dek_iv?: string | null
          dek_iv_backup?: string | null
          encrypted_dek?: string | null
          encrypted_dek_backup?: string | null
          id: string
          kdf_iterations?: number
          max_filter_selections?: number
          notification_type?: string | null
          pomodoro_time?: number | null
          salt?: string | null
          salt_backup?: string | null
          theme?: string | null
          username: string
          view?: string | null
        }
        Update: {
          created_at?: string | null
          dek_iv?: string | null
          dek_iv_backup?: string | null
          encrypted_dek?: string | null
          encrypted_dek_backup?: string | null
          id?: string
          kdf_iterations?: number
          max_filter_selections?: number
          notification_type?: string | null
          pomodoro_time?: number | null
          salt?: string | null
          salt_backup?: string | null
          theme?: string | null
          username?: string
          view?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: number
          name: string
          name_enc: string | null
          name_hash: string | null
          name_iv: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: number
          name: string
          name_enc?: string | null
          name_hash?: string | null
          name_iv?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: number
          name?: string
          name_enc?: string | null
          name_hash?: string | null
          name_iv?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: number
          task_id: number
        }
        Insert: {
          tag_id: number
          task_id: number
        }
        Update: {
          tag_id?: number
          task_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category_id: number | null
          completed_at: string | null
          created_at: string
          description: string
          description_enc: string | null
          description_iv: string | null
          done: boolean
          id: number
          scheduled: string | null
          sort_order: number
          title: string
          title_enc: string | null
          title_iv: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string
          description_enc?: string | null
          description_iv?: string | null
          done?: boolean
          id?: number
          scheduled?: string | null
          sort_order?: number
          title: string
          title_enc?: string | null
          title_iv?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string
          description_enc?: string | null
          description_iv?: string | null
          done?: boolean
          id?: number
          scheduled?: string | null
          sort_order?: number
          title?: string
          title_enc?: string | null
          title_iv?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
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
