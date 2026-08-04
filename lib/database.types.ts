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
      sequence_enrollments: {
        Row: {
          enrolled_at: string
          external_id: string | null
          id: string
          lead_id: string
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
