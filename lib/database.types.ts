export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      message_variants: {
        Row: {
          id: string
          provider: string
          campaign_external_id: string | null
          campaign_name: string | null
          step_number: number
          angle: string | null
          hook: string | null
          cta: string | null
          segment: string | null
          label: string | null
          subject: string | null
          body_preview: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: { [k: string]: unknown }
        Update: { [k: string]: unknown }
        Relationships: []
      }
      suppressions: {
        Row: {
          id: string
          email: string | null
          linkedin_url: string | null
          domain: string | null
          reason: string
          notes: string | null
          source: string | null
          created_by: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: { [k: string]: unknown }
        Update: { [k: string]: unknown }
        Relationships: []
      }
      channel_health: {
        Row: {
          id: string
          provider: string
          identifier: string
          display_name: string | null
          status: string
          detail: string | null
          checked_at: string
        }
        Insert: { [k: string]: unknown }
        Update: { [k: string]: unknown }
        Relationships: []
      }
      routing_rules: {
        Row: {
          id: string
          name: string
          priority: number
          is_active: boolean
          match_source: string[] | null
          match_channel: string | null
          match_industry: string[] | null
          min_employees: number | null
          max_employees: number | null
          requires_email: boolean
          requires_linkedin: boolean
          provider: string
          campaign_external_id: string
          campaign_name: string | null
          linkedin_account_id: number | null
          auto_enroll: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          priority?: number
          is_active?: boolean
          match_source?: string[] | null
          match_channel?: string | null
          match_industry?: string[] | null
          min_employees?: number | null
          max_employees?: number | null
          requires_email?: boolean
          requires_linkedin?: boolean
          provider: string
          campaign_external_id: string
          campaign_name?: string | null
          linkedin_account_id?: number | null
          auto_enroll?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          priority?: number
          is_active?: boolean
          match_source?: string[] | null
          match_channel?: string | null
          match_industry?: string[] | null
          min_employees?: number | null
          max_employees?: number | null
          requires_email?: boolean
          requires_linkedin?: boolean
          provider?: string
          campaign_external_id?: string
          campaign_name?: string | null
          linkedin_account_id?: number | null
          auto_enroll?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          id: boolean
          auto_draft_replies: boolean
          auto_send_replies: boolean
          auto_advance_sequences: boolean
          auto_send_sequence_steps: boolean
          pause_on_reply: boolean
          send_window_start: number
          send_window_end: number
          timezone: string
          max_actions_per_run: number
          auto_enroll_leads: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          auto_draft_replies?: boolean
          auto_send_replies?: boolean
          auto_advance_sequences?: boolean
          auto_send_sequence_steps?: boolean
          pause_on_reply?: boolean
          send_window_start?: number
          send_window_end?: number
          timezone?: string
          max_actions_per_run?: number
          auto_enroll_leads?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          auto_draft_replies?: boolean
          auto_send_replies?: boolean
          auto_advance_sequences?: boolean
          auto_send_sequence_steps?: boolean
          pause_on_reply?: boolean
          send_window_start?: number
          send_window_end?: number
          timezone?: string
          max_actions_per_run?: number
          auto_enroll_leads?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          id: string
          started_at: string
          finished_at: string | null
          trigger: string
          replies_drafted: number
          steps_advanced: number
          actions_sent: number
          errors: Json
          notes: string | null
        }
        Insert: {
          id?: string
          started_at?: string
          finished_at?: string | null
          trigger?: string
          replies_drafted?: number
          steps_advanced?: number
          actions_sent?: number
          errors?: Json
          notes?: string | null
        }
        Update: {
          id?: string
          started_at?: string
          finished_at?: string | null
          trigger?: string
          replies_drafted?: number
          steps_advanced?: number
          actions_sent?: number
          errors?: Json
          notes?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          body: string | null
          channel: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          direction: string | null
          id: string
          lead_id: string | null
          metadata: Json
          occurred_at: string
          source: string | null
          title: string | null
          type: string
          variant_id: string | null
          classification: string | null
        }
        Insert: {
          body?: string | null
          channel?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          source?: string | null
          title?: string | null
          type: string
        }
        Update: {
          body?: string | null
          channel?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          source?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "message_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          domain: string | null
          employee_count: number | null
          enrichment: Json
          id: string
          industry: string | null
          linkedin_url: string | null
          location: string | null
          name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          enrichment?: Json
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          enrichment?: Json
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          enrichment: Json
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          enrichment?: Json
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          enrichment?: Json
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          event_type: string | null
          external_id: string | null
          id: string
          payload: Json
          processed: boolean
          processing_error: string | null
          provider: string
          received_at: string
        }
        Insert: {
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          provider: string
          received_at?: string
        }
        Update: {
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          channel: string
          company_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          last_activity_at: string | null
          message: string | null
          owner_id: string | null
          priority: string | null
          score: number
          source: string
          source_detail: Json
          status: string
          tier: string | null
          segment: string | null
          suppressed_at: string | null
          parked_until: string | null
          park_trigger: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string | null
          message?: string | null
          owner_id?: string | null
          priority?: string | null
          score?: number
          source?: string
          source_detail?: Json
          status?: string
          tier?: string | null
          segment?: string | null
          suppressed_at?: string | null
          parked_until?: string | null
          park_trigger?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string | null
          message?: string | null
          owner_id?: string | null
          priority?: string | null
          score?: number
          source?: string
          source_detail?: Json
          status?: string
          tier?: string | null
          segment?: string | null
          suppressed_at?: string | null
          parked_until?: string | null
          park_trigger?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_actions: {
        Row: {
          approved_by: string | null
          contact_id: string | null
          created_at: string
          decided_at: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          payload: Json
          proposed_by: string | null
          reasoning: string | null
          requires_approval: boolean
          result: Json | null
          status: string
          thread_id: string | null
          title: string | null
          type: string
          classification: string | null
          confidence: number | null
          trigger_activity_id: string | null
        }
        Insert: {
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          decided_at?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          proposed_by?: string | null
          reasoning?: string | null
          requires_approval?: boolean
          result?: Json | null
          status?: string
          thread_id?: string | null
          title?: string | null
          type: string
        }
        Update: {
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          decided_at?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          proposed_by?: string | null
          reasoning?: string | null
          requires_approval?: boolean
          result?: Json | null
          status?: string
          thread_id?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          channel: string
          contact_id: string | null
          created_at: string
          direction: string
          drafted_by: string | null
          external_id: string | null
          from_address: string | null
          id: string
          lead_id: string | null
          metadata: Json
          provider: string | null
          sent_at: string | null
          subject: string | null
          thread_id: string | null
          to_address: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          contact_id?: string | null
          created_at?: string
          direction: string
          drafted_by?: string | null
          external_id?: string | null
          from_address?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          provider?: string | null
          sent_at?: string | null
          subject?: string | null
          thread_id?: string | null
          to_address?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          direction?: string
          drafted_by?: string | null
          external_id?: string | null
          from_address?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          provider?: string | null
          sent_at?: string | null
          subject?: string | null
          thread_id?: string | null
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          channel: string
          contact_id: string | null
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          provider: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          contact_id?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          provider?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_id?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          provider?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sequence_steps: {
        Row: {
          action_type: string
          channel: string
          id: string
          is_active: boolean
          prompt: string | null
          sequence_id: string
          step_number: number
          wait_days: number
        }
        Insert: {
          action_type?: string
          channel: string
          id?: string
          is_active?: boolean
          prompt?: string | null
          sequence_id: string
          step_number: number
          wait_days?: number
        }
        Update: {
          action_type?: string
          channel?: string
          id?: string
          is_active?: boolean
          prompt?: string | null
          sequence_id?: string
          step_number?: number
          wait_days?: number
        }
        Relationships: []
      }
      sequence_enrollments: {
        Row: {
          current_step: number
          enrolled_at: string
          external_id: string | null
          id: string
          lead_id: string
          next_action_at: string | null
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          enrolled_at?: string
          external_id?: string | null
          id?: string
          lead_id: string
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          enrolled_at?: string
          external_id?: string | null
          id?: string
          lead_id?: string
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          channel: string
          created_at: string
          external_id: string | null
          id: string
          name: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          external_id?: string | null
          id?: string
          name: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      variant_analytics: {
        Args: { p_days?: number; p_campaign?: string | null; p_min_sends?: number }
        Returns: Json
      }
      campaign_overview: {
        Args: { p_days?: number }
        Returns: Json
      }
      needs_attention: {
        Args: Record<string, never>
        Returns: Json
      }
      wake_due_resignals: {
        Args: { p_secret: string }
        Returns: number
      }
      suppress_contact: {
        Args: { p_email: string | null; p_linkedin: string | null; p_reason: string; p_source?: string | null }
        Returns: undefined
      }
      automation_get_enrollments: {
        Args: { p_secret: string; p_limit?: number }
        Returns: Json
      }
      automation_record_enrollment: {
        Args: {
          p_secret: string
          p_lead_id: string
          p_provider: string
          p_external_id: string
          p_name: string | null
          p_rule_id: string
          p_external_lead_id?: string | null
        }
        Returns: string
      }
      crm_analytics: {
        Args: { p_days?: number }
        Returns: Json
      }
      automation_get_work: {
        Args: { p_secret: string; p_limit?: number }
        Returns: Json
      }
      automation_record_action: {
        Args: {
          p_secret: string
          p_lead_id: string
          p_type: string
          p_title: string
          p_reasoning: string
          p_payload: Json
          p_trigger_activity_id?: string | null
          p_status?: string
        }
        Returns: string
      }
      automation_complete_action: {
        Args: {
          p_secret: string
          p_action_id: string
          p_status: string
          p_result?: Json
          p_activity?: Json
        }
        Returns: undefined
      }
      automation_pause_on_reply: {
        Args: { p_secret: string; p_lead_id: string }
        Returns: undefined
      }
      automation_log_run: {
        Args: {
          p_secret: string
          p_replies_drafted: number
          p_actions_sent: number
          p_errors?: Json
          p_notes?: string | null
        }
        Returns: undefined
      }
      crm_ingest: {
        Args: {
          p_activity?: Json
          p_channel: string
          p_company?: Json
          p_contact?: Json
          p_event_type: string
          p_external_id: string
          p_lead?: Json
          p_provider: string
          p_raw?: Json
          p_secret: string
          p_source: string
        }
        Returns: Json
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

type DefaultSchema = Database["public"]

export type Tables<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]
