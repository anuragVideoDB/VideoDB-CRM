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
