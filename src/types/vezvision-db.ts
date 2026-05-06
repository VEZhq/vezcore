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
      messages: {
        Row: {
          client_ip: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          language: string | null
          message: string
          phone: string | null
          status: string
          subject: string
        }
        Insert: {
          client_ip?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          language?: string | null
          message: string
          phone?: string | null
          status?: string
          subject: string
        }
        Update: {
          client_ip?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          language?: string | null
          message?: string
          phone?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          key: string
          reset_time: string
          updated_at: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          key: string
          reset_time: string
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string | null
          key?: string
          reset_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_blog_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name_en: string | null
          name_pl: string
          order_index: number
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name_en?: string | null
          name_pl: string
          order_index?: number
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name_en?: string | null
          name_pl?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      vv_blog_post_categories: {
        Row: {
          category_id: string
          is_primary: boolean
          post_id: string
        }
        Insert: {
          category_id: string
          is_primary?: boolean
          post_id: string
        }
        Update: {
          category_id?: string
          is_primary?: boolean
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vv_blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_blog_post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "vv_blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_blog_posts: {
        Row: {
          author_id: string | null
          content_en: string | null
          content_pl: string
          created_at: string
          created_by: string | null
          excerpt_en: string | null
          excerpt_pl: string | null
          featured: boolean
          featured_image: string | null
          id: string
          meta_desc_en: string | null
          meta_desc_pl: string | null
          meta_title_en: string | null
          meta_title_pl: string | null
          published_at: string | null
          reading_time: number
          scheduled_for: string | null
          slug: string
          status: string
          tags_en: string[]
          tags_pl: string[]
          title_en: string | null
          title_pl: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          content_en?: string | null
          content_pl?: string
          created_at?: string
          created_by?: string | null
          excerpt_en?: string | null
          excerpt_pl?: string | null
          featured?: boolean
          featured_image?: string | null
          id?: string
          meta_desc_en?: string | null
          meta_desc_pl?: string | null
          meta_title_en?: string | null
          meta_title_pl?: string | null
          published_at?: string | null
          reading_time?: number
          scheduled_for?: string | null
          slug: string
          status?: string
          tags_en?: string[]
          tags_pl?: string[]
          title_en?: string | null
          title_pl: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          content_en?: string | null
          content_pl?: string
          created_at?: string
          created_by?: string | null
          excerpt_en?: string | null
          excerpt_pl?: string | null
          featured?: boolean
          featured_image?: string | null
          id?: string
          meta_desc_en?: string | null
          meta_desc_pl?: string | null
          meta_title_en?: string | null
          meta_title_pl?: string | null
          published_at?: string | null
          reading_time?: number
          scheduled_for?: string | null
          slug?: string
          status?: string
          tags_en?: string[]
          tags_pl?: string[]
          title_en?: string | null
          title_pl?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      vv_calendar_events: {
        Row: {
          all_day: boolean
          category: string
          color: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          end_at: string | null
          id: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          category?: string
          color?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          category?: string
          color?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      vv_faq_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_en: string | null
          name_pl: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_pl: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_pl?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      vv_faq_items: {
        Row: {
          answer_en: string | null
          answer_pl: string
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          order_index: number
          question_en: string | null
          question_pl: string
          updated_at: string
        }
        Insert: {
          answer_en?: string | null
          answer_pl: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          question_en?: string | null
          question_pl: string
          updated_at?: string
        }
        Update: {
          answer_en?: string | null
          answer_pl?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          question_en?: string | null
          question_pl?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_faq_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vv_faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_file_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          file_id: string | null
          folder_id: string | null
          id: string
          ip: string | null
          payload: Json
          user_agent: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          user_agent?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_file_events_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "vv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_file_events_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vv_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_file_permissions: {
        Row: {
          can_manage: boolean
          can_upload: boolean
          can_view: boolean
          created_at: string
          file_id: string | null
          folder_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_file_permissions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "vv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_file_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vv_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_files: {
        Row: {
          checksum_sha256: string | null
          created_at: string
          deleted_at: string | null
          folder_id: string | null
          id: string
          is_public: boolean
          metadata: Json
          mime_type: string
          original_name: string
          owner_id: string | null
          owner_type: string | null
          owner_user_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          mime_type: string
          original_name: string
          owner_id?: string | null
          owner_type?: string | null
          owner_user_id?: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          mime_type?: string
          original_name?: string
          owner_id?: string | null
          owner_type?: string | null
          owner_user_id?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vv_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_folders: {
        Row: {
          created_at: string
          full_path: string
          id: string
          is_system: boolean
          name: string
          owner_user_id: string | null
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_path: string
          id?: string
          is_system?: boolean
          name: string
          owner_user_id?: string | null
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_path?: string
          id?: string
          is_system?: boolean
          name?: string
          owner_user_id?: string | null
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vv_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_legal_documents: {
        Row: {
          content_en: string
          content_pl: string
          created_at: string
          document_key: string
          is_published: boolean
          last_updated: string
          title_en: string
          title_pl: string
          updated_at: string
          version: string
        }
        Insert: {
          content_en: string
          content_pl: string
          created_at?: string
          document_key: string
          is_published?: boolean
          last_updated?: string
          title_en: string
          title_pl: string
          updated_at?: string
          version?: string
        }
        Update: {
          content_en?: string
          content_pl?: string
          created_at?: string
          document_key?: string
          is_published?: boolean
          last_updated?: string
          title_en?: string
          title_pl?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      vv_newsletter_campaigns: {
        Row: {
          content_html: string
          content_html_en: string | null
          created_at: string
          created_by: string | null
          id: string
          recipient_count: number
          scheduled_for: string | null
          segment_language: string | null
          segment_tags: string[] | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          subject_en: string | null
          template_config: Json | null
          updated_at: string
        }
        Insert: {
          content_html: string
          content_html_en?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          segment_language?: string | null
          segment_tags?: string[] | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          subject_en?: string | null
          template_config?: Json | null
          updated_at?: string
        }
        Update: {
          content_html?: string
          content_html_en?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          segment_language?: string | null
          segment_tags?: string[] | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          subject_en?: string | null
          template_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      vv_newsletter_send_logs: {
        Row: {
          attempt_no: number
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          provider: string
          provider_message_id: string | null
          status: string
          subscriber_email: string
          subscriber_id: string
        }
        Insert: {
          attempt_no?: number
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string
          provider_message_id?: string | null
          status: string
          subscriber_email: string
          subscriber_id: string
        }
        Update: {
          attempt_no?: number
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string
          provider_message_id?: string | null
          status?: string
          subscriber_email?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_newsletter_send_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vv_newsletter_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_newsletter_send_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "vv_newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          language: string
          last_name: string | null
          source: string
          subscribed_at: string
          tags: string[]
          token: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_name?: string | null
          source?: string
          subscribed_at?: string
          tags?: string[]
          token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_name?: string | null
          source?: string
          subscribed_at?: string
          tags?: string[]
          token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vv_newsletter_templates: {
        Row: {
          content_html: string
          content_html_en: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          order_index: number | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          content_html: string
          content_html_en?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          order_index?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          content_html?: string
          content_html_en?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          order_index?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vv_page_sections: {
        Row: {
          config: Json
          content_en: Json
          content_pl: Json
          created_at: string
          enabled: boolean
          is_public: boolean
          order_index: number
          page_key: string
          section_key: string
          updated_at: string
        }
        Insert: {
          config?: Json
          content_en?: Json
          content_pl?: Json
          created_at?: string
          enabled?: boolean
          is_public?: boolean
          order_index?: number
          page_key: string
          section_key: string
          updated_at?: string
        }
        Update: {
          config?: Json
          content_en?: Json
          content_pl?: Json
          created_at?: string
          enabled?: boolean
          is_public?: boolean
          order_index?: number
          page_key?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      vv_page_seo: {
        Row: {
          canonical_url: string
          created_at: string
          description_en: string
          description_pl: string
          indexable: boolean
          is_public: boolean
          og_description_en: string
          og_description_pl: string
          og_image_url: string
          og_title_en: string
          og_title_pl: string
          page_key: string
          robots: string
          structured_data_json: string
          title_en: string
          title_pl: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string
          created_at?: string
          description_en: string
          description_pl: string
          indexable?: boolean
          is_public?: boolean
          og_description_en?: string
          og_description_pl?: string
          og_image_url?: string
          og_title_en?: string
          og_title_pl?: string
          page_key: string
          robots?: string
          structured_data_json?: string
          title_en: string
          title_pl: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string
          created_at?: string
          description_en?: string
          description_pl?: string
          indexable?: boolean
          is_public?: boolean
          og_description_en?: string
          og_description_pl?: string
          og_image_url?: string
          og_title_en?: string
          og_title_pl?: string
          page_key?: string
          robots?: string
          structured_data_json?: string
          title_en?: string
          title_pl?: string
          updated_at?: string
        }
        Relationships: []
      }
      vv_project_categories: {
        Row: {
          created_at: string
          id: string
          name_en: string | null
          name_pl: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_en?: string | null
          name_pl: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string | null
          name_pl?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      vv_project_category_assignments: {
        Row: {
          category_id: string
          project_id: string
        }
        Insert: {
          category_id: string
          project_id: string
        }
        Update: {
          category_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_project_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vv_project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_project_category_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vv_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_project_images: {
        Row: {
          alt_en: string | null
          alt_pl: string | null
          created_at: string
          id: string
          order_index: number
          path: string
          project_id: string
          type: string
        }
        Insert: {
          alt_en?: string | null
          alt_pl?: string | null
          created_at?: string
          id?: string
          order_index?: number
          path: string
          project_id: string
          type?: string
        }
        Update: {
          alt_en?: string | null
          alt_pl?: string | null
          created_at?: string
          id?: string
          order_index?: number
          path?: string
          project_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vv_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_project_technologies: {
        Row: {
          color: string
          icon: string | null
          id: string
          name: string
          order_index: number
          project_id: string
        }
        Insert: {
          color?: string
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          project_id: string
        }
        Update: {
          color?: string
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_project_technologies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vv_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_projects: {
        Row: {
          challenge_en: string | null
          challenge_pl: string | null
          client_name: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          demo_url: string | null
          description_en: string | null
          description_pl: string | null
          featured: boolean
          github_url: string | null
          id: string
          order_index: number
          seo_desc_en: string | null
          seo_desc_pl: string | null
          seo_title_en: string | null
          seo_title_pl: string | null
          short_desc_en: string | null
          short_desc_pl: string | null
          show_challenge: boolean
          show_cover_image: boolean
          show_demo_url: boolean
          show_solution: boolean
          slug: string
          solution_en: string | null
          solution_pl: string | null
          status: string
          title_en: string | null
          title_pl: string
          updated_at: string
        }
        Insert: {
          challenge_en?: string | null
          challenge_pl?: string | null
          client_name?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          demo_url?: string | null
          description_en?: string | null
          description_pl?: string | null
          featured?: boolean
          github_url?: string | null
          id?: string
          order_index?: number
          seo_desc_en?: string | null
          seo_desc_pl?: string | null
          seo_title_en?: string | null
          seo_title_pl?: string | null
          short_desc_en?: string | null
          short_desc_pl?: string | null
          show_challenge?: boolean
          show_cover_image?: boolean
          show_demo_url?: boolean
          show_solution?: boolean
          slug: string
          solution_en?: string | null
          solution_pl?: string | null
          status?: string
          title_en?: string | null
          title_pl: string
          updated_at?: string
        }
        Update: {
          challenge_en?: string | null
          challenge_pl?: string | null
          client_name?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          demo_url?: string | null
          description_en?: string | null
          description_pl?: string | null
          featured?: boolean
          github_url?: string | null
          id?: string
          order_index?: number
          seo_desc_en?: string | null
          seo_desc_pl?: string | null
          seo_title_en?: string | null
          seo_title_pl?: string | null
          short_desc_en?: string | null
          short_desc_pl?: string | null
          show_challenge?: boolean
          show_cover_image?: boolean
          show_demo_url?: boolean
          show_solution?: boolean
          slug?: string
          solution_en?: string | null
          solution_pl?: string | null
          status?: string
          title_en?: string | null
          title_pl?: string
          updated_at?: string
        }
        Relationships: []
      }
      vv_service_categories: {
        Row: {
          created_at: string
          id: string
          name_en: string | null
          name_pl: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_en?: string | null
          name_pl: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string | null
          name_pl?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      vv_service_category_assignments: {
        Row: {
          category_id: string
          service_id: string
        }
        Insert: {
          category_id: string
          service_id: string
        }
        Update: {
          category_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_service_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vv_service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_service_category_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vv_services"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_services: {
        Row: {
          created_at: string
          created_by: string | null
          description_en: string | null
          description_pl: string | null
          duration: string | null
          icon: string | null
          id: string
          image_url: string | null
          meta_desc_en: string | null
          meta_desc_pl: string | null
          meta_title_en: string | null
          meta_title_pl: string | null
          order_index: number
          price: number | null
          price_from: boolean
          price_unit: string
          short_desc_en: string | null
          short_desc_pl: string | null
          slug: string
          status: string
          title_en: string | null
          title_pl: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_pl?: string | null
          duration?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          meta_desc_en?: string | null
          meta_desc_pl?: string | null
          meta_title_en?: string | null
          meta_title_pl?: string | null
          order_index?: number
          price?: number | null
          price_from?: boolean
          price_unit?: string
          short_desc_en?: string | null
          short_desc_pl?: string | null
          slug: string
          status?: string
          title_en?: string | null
          title_pl: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_pl?: string | null
          duration?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          meta_desc_en?: string | null
          meta_desc_pl?: string | null
          meta_title_en?: string | null
          meta_title_pl?: string | null
          order_index?: number
          price?: number | null
          price_from?: boolean
          price_unit?: string
          short_desc_en?: string | null
          short_desc_pl?: string | null
          slug?: string
          status?: string
          title_en?: string | null
          title_pl?: string
          updated_at?: string
        }
        Relationships: []
      }
      vv_site_settings: {
        Row: {
          created_at: string
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_rate_limits: { Args: never; Returns: undefined }
      consume_rate_limit: {
        Args: { p_key: string; p_max_requests: number; p_window_ms: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_time: string
        }[]
      }
      get_active_storage_used_bytes: { Args: never; Returns: number }
      get_user_emails_by_ids: {
        Args: { user_ids: string[] }
        Returns: { id: string; email: string | null }[]
      }
      get_folder_chain: {
        Args: { start_folder_id: string }
        Returns: {
          created_at: string
          full_path: string
          id: string
          is_system: boolean
          name: string
          owner_user_id: string
          parent_id: string
          slug: string
          updated_at: string
        }[]
      }
      safe_insert_contact_message: {
        Args: {
          p_client_ip?: string
          p_email: string
          p_full_name: string
          p_language?: string
          p_message: string
          p_phone?: string
          p_status?: string
          p_subject: string
        }
        Returns: string
      }
      safe_insert_newsletter_subscriber:
        | { Args: { p_client_ip?: string; p_email: string }; Returns: string }
        | {
            Args: {
              p_client_ip?: string
              p_email: string
              p_language?: string
              p_source?: string
            }
            Returns: string
          }
      unsubscribe_by_email: { Args: { email_input: string }; Returns: Json }
      unsubscribe_by_token: { Args: { token_input: string }; Returns: Json }
      vv_blog_increment_views: { Args: { post_slug: string }; Returns: number }
      vv_blog_publish_scheduled: {
        Args: never
        Returns: {
          published_id: string
          published_slug: string
        }[]
      }
      vv_dashboard_stats: {
        Args: never
        Returns: {
          blog_published: number
          blog_total: number
          faq_active: number
          faq_total: number
          files_public: number
          files_total: number
          newsletter_active: number
          newsletter_total: number
          portfolio_published: number
          portfolio_total: number
          services_active: number
          services_total: number
        }[]
      }
      vv_has_files_permission: {
        Args: { required_key: string }
        Returns: boolean
      }
      vv_has_folder_manage_access: {
        Args: { target_folder_id: string }
        Returns: boolean
      }
      vv_has_root_files_permission: {
        Args: { required_key: string }
        Returns: boolean
      }
      vv_is_admin: { Args: never; Returns: boolean }
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

