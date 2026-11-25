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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          attachment_type: string | null
          business_id: string
          created_at: string
          created_by: string | null
          expense_id: string | null
          file_name: string | null
          id: string
          invoice_id: string | null
          mime_type: string | null
          public_id: string | null
          url: string | null
        }
        Insert: {
          attachment_type?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          file_name?: string | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          public_id?: string | null
          url?: string | null
        }
        Update: {
          attachment_type?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          file_name?: string | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          public_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_expense_id_business_id_fkey"
            columns: ["expense_id", "business_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "attachments_invoice_id_business_id_fkey"
            columns: ["invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          business_id: string | null
          details: Json
          id: string
          occurred_at: string
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          business_id?: string | null
          details?: Json
          id?: string
          occurred_at?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          business_id?: string | null
          details?: Json
          id?: string
          occurred_at?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          business_id: string
          cheque_name: string | null
          created_at: string
          created_by: string | null
          holder_name: string | null
          id: string
          ifsc: string | null
          is_active: boolean
          label: string | null
          source: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          business_id: string
          cheque_name?: string | null
          created_at?: string
          created_by?: string | null
          holder_name?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          label?: string | null
          source?: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          business_id?: string
          cheque_name?: string | null
          created_at?: string
          created_by?: string | null
          holder_name?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          label?: string | null
          source?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          brand_color: string | null
          business_type: string | null
          city: string | null
          contact: string | null
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          gst_type: string | null
          gstin: string | null
          id: string
          invoice_fy_format: string
          invoice_include_fy: boolean
          invoice_padding: number
          invoice_prefix: string
          invoice_separator: string
          invoice_start_number: number
          invoice_template: string
          is_composition: boolean
          legal_name: string | null
          name: string
          pan: string | null
          pin: string | null
          signature_url: string | null
          state: string | null
          state_code: string | null
          status: string
          tax_behavior: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          business_type?: string | null
          city?: string | null
          contact?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          gst_type?: string | null
          gstin?: string | null
          id?: string
          invoice_fy_format?: string
          invoice_include_fy?: boolean
          invoice_padding?: number
          invoice_prefix?: string
          invoice_separator?: string
          invoice_start_number?: number
          invoice_template?: string
          is_composition?: boolean
          legal_name?: string | null
          name: string
          pan?: string | null
          pin?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          status?: string
          tax_behavior?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          business_type?: string | null
          city?: string | null
          contact?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          gst_type?: string | null
          gstin?: string | null
          id?: string
          invoice_fy_format?: string
          invoice_include_fy?: boolean
          invoice_padding?: number
          invoice_prefix?: string
          invoice_separator?: string
          invoice_start_number?: number
          invoice_template?: string
          is_composition?: boolean
          legal_name?: string | null
          name?: string
          pan?: string | null
          pin?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          status?: string
          tax_behavior?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          business_id: string
          call_time: string | null
          created_at: string
          created_by: string | null
          duration: string | null
          ends_at: string | null
          google_event_id: string | null
          ical_uid: string | null
          id: string
          legacy_date: string | null
          starts_at: string | null
          status: string | null
          sync_to_google: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          call_time?: string | null
          created_at?: string
          created_by?: string | null
          duration?: string | null
          ends_at?: string | null
          google_event_id?: string | null
          ical_uid?: string | null
          id?: string
          legacy_date?: string | null
          starts_at?: string | null
          status?: string | null
          sync_to_google?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          call_time?: string | null
          created_at?: string
          created_by?: string | null
          duration?: string | null
          ends_at?: string | null
          google_event_id?: string | null
          ical_uid?: string | null
          id?: string
          legacy_date?: string | null
          starts_at?: string | null
          status?: string | null
          sync_to_google?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          business_id: string
          client_type: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          custom_term_days: number | null
          display_name: string
          email: string | null
          first_name: string | null
          gstin: string | null
          id: string
          is_tds_deducting: boolean
          last_name: string | null
          mobile: string | null
          pan: string | null
          payment_terms: string | null
          phone: string | null
          salutation: string | null
          source: string
          tan: string | null
          updated_at: string
          work_phone: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          client_type?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_term_days?: number | null
          display_name: string
          email?: string | null
          first_name?: string | null
          gstin?: string | null
          id?: string
          is_tds_deducting?: boolean
          last_name?: string | null
          mobile?: string | null
          pan?: string | null
          payment_terms?: string | null
          phone?: string | null
          salutation?: string | null
          source?: string
          tan?: string | null
          updated_at?: string
          work_phone?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          client_type?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_term_days?: number | null
          display_name?: string
          email?: string | null
          first_name?: string | null
          gstin?: string | null
          id?: string
          is_tds_deducting?: boolean
          last_name?: string | null
          mobile?: string | null
          pan?: string | null
          payment_terms?: string | null
          phone?: string | null
          salutation?: string | null
          source?: string
          tan?: string | null
          updated_at?: string
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          description: string | null
          estimate_id: string
          id: string
          item_type: string | null
          quantity: number
          rate: number
          sac_code: string | null
          service_id: string | null
          sort_order: number
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          description?: string | null
          estimate_id: string
          id?: string
          item_type?: string | null
          quantity?: number
          rate?: number
          sac_code?: string | null
          service_id?: string | null
          sort_order?: number
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          description?: string | null
          estimate_id?: string
          id?: string
          item_type?: string | null
          quantity?: number
          rate?: number
          sac_code?: string | null
          service_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_business_id_fkey"
            columns: ["estimate_id", "business_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "estimate_items_service_business_fk"
            columns: ["service_id", "business_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      estimates: {
        Row: {
          advance_deadline_days: number | null
          advance_intent: number
          advance_percentage: number | null
          business_id: string
          client_id: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          estimate_date: string | null
          estimate_number: string
          id: string
          notes: string | null
          recipient_contact: string | null
          recipient_name: string | null
          requires_advance: boolean
          status: string
          subtotal: number
          terms_and_conditions: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          advance_deadline_days?: number | null
          advance_intent?: number
          advance_percentage?: number | null
          business_id: string
          client_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          estimate_date?: string | null
          estimate_number: string
          id?: string
          notes?: string | null
          recipient_contact?: string | null
          recipient_name?: string | null
          requires_advance?: boolean
          status?: string
          subtotal?: number
          terms_and_conditions?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          advance_deadline_days?: number | null
          advance_intent?: number
          advance_percentage?: number | null
          business_id?: string
          client_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          estimate_date?: string | null
          estimate_number?: string
          id?: string
          notes?: string | null
          recipient_contact?: string | null
          recipient_name?: string | null
          requires_advance?: boolean
          status?: string
          subtotal?: number
          terms_and_conditions?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_client_business_fk"
            columns: ["client_id", "business_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "estimates_converted_invoice_business_fk"
            columns: ["converted_invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_id: string | null
          display_number: number | null
          expense_date: string | null
          gst_amount: number
          gst_charged: boolean
          id: string
          itc_review: string | null
          notes: string | null
          ocr_status: string | null
          ocr_suggestions: Json | null
          source: string
          status: string
          updated_at: string
          vendor_gstin: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          business_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_id?: string | null
          display_number?: number | null
          expense_date?: string | null
          gst_amount?: number
          gst_charged?: boolean
          id?: string
          itc_review?: string | null
          notes?: string | null
          ocr_status?: string | null
          ocr_suggestions?: Json | null
          source?: string
          status?: string
          updated_at?: string
          vendor_gstin?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_id?: string | null
          display_number?: number | null
          expense_date?: string | null
          gst_amount?: number
          gst_charged?: boolean
          id?: string
          itc_review?: string | null
          notes?: string | null
          ocr_status?: string | null
          ocr_suggestions?: Json | null
          source?: string
          status?: string
          updated_at?: string
          vendor_gstin?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          item_type: string | null
          quantity: number
          rate: number
          sac_code: string | null
          service_id: string | null
          sort_order: number
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          item_type?: string | null
          quantity?: number
          rate?: number
          sac_code?: string | null
          service_id?: string | null
          sort_order?: number
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          item_type?: string | null
          quantity?: number
          rate?: number
          sac_code?: string | null
          service_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_business_id_fkey"
            columns: ["invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "invoice_items_service_business_fk"
            columns: ["service_id", "business_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      invoices: {
        Row: {
          advance_amount: number
          bank_account_id: string | null
          business_id: string
          cgst: number
          client_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          igst: number
          invoice_date: string | null
          invoice_number: string
          is_advance_received: boolean
          last_reminder_sent_at: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          payment_terms: string | null
          sent_at: string | null
          sgst: number
          source: string
          source_estimate_id: string | null
          status: string
          subject: string | null
          subtotal: number
          tds_amount: number
          tds_deducted: boolean
          terms_and_conditions: string | null
          total: number
          updated_at: string
          usage_duration: string | null
          usage_exclusivity: string | null
          usage_geography: string | null
          usage_other: string | null
          usage_type: string | null
        }
        Insert: {
          advance_amount?: number
          bank_account_id?: string | null
          business_id: string
          cgst?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number: string
          is_advance_received?: boolean
          last_reminder_sent_at?: string | null
          notes?: string | null
          order_number?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          sent_at?: string | null
          sgst?: number
          source?: string
          source_estimate_id?: string | null
          status?: string
          subject?: string | null
          subtotal?: number
          tds_amount?: number
          tds_deducted?: boolean
          terms_and_conditions?: string | null
          total?: number
          updated_at?: string
          usage_duration?: string | null
          usage_exclusivity?: string | null
          usage_geography?: string | null
          usage_other?: string | null
          usage_type?: string | null
        }
        Update: {
          advance_amount?: number
          bank_account_id?: string | null
          business_id?: string
          cgst?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number?: string
          is_advance_received?: boolean
          last_reminder_sent_at?: string | null
          notes?: string | null
          order_number?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          sent_at?: string | null
          sgst?: number
          source?: string
          source_estimate_id?: string | null
          status?: string
          subject?: string | null
          subtotal?: number
          tds_amount?: number
          tds_deducted?: boolean
          terms_and_conditions?: string | null
          total?: number
          updated_at?: string
          usage_duration?: string | null
          usage_exclusivity?: string | null
          usage_geography?: string | null
          usage_other?: string | null
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_bank_business_fk"
            columns: ["bank_account_id", "business_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_business_fk"
            columns: ["client_id", "business_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "invoices_estimate_business_fk"
            columns: ["source_estimate_id", "business_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_number: string | null
          tds_amount: number
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          reference_number?: string | null
          tds_amount?: number
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          tds_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_business_id_fkey"
            columns: ["bank_account_id", "business_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_business_id_fkey"
            columns: ["invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rate: number
          sac_code: string | null
          source: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          sac_code?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          sac_code?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string | null
          rate: number
          tax_type: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string | null
          rate?: number
          tax_type?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string | null
          rate?: number
          tax_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          business_id: string
          cgst_rate: number
          created_at: string
          id: string
          igst_rate: number
          is_default: boolean
          sgst_rate: number
          updated_at: string
        }
        Insert: {
          business_id: string
          cgst_rate?: number
          created_at?: string
          id?: string
          igst_rate?: number
          is_default?: boolean
          sgst_rate?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          cgst_rate?: number
          created_at?: string
          id?: string
          igst_rate?: number
          is_default?: boolean
          sgst_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_entries: {
        Row: {
          amount: number
          business_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          financial_year: string | null
          has_certificate: boolean
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          financial_year?: string | null
          has_certificate?: boolean
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          financial_year?: string | null
          has_certificate?: boolean
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_entries_client_id_business_id_fkey"
            columns: ["client_id", "business_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      terms_templates: {
        Row: {
          business_id: string
          content: string | null
          created_at: string
          id: string
          is_default: boolean
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_business: {
        Args: {
          p_business_type?: string
          p_legal_name?: string
          p_name: string
        }
        Returns: string
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
    Enums: {},
  },
} as const
