/**
 * Generated Supabase types for project jybloszaucgqlbkzquqw (schema public).
 *
 * Generated on 6 Nov 2026 with the Supabase MCP tool `generate_typescript_types`
 * (project_id jybloszaucgqlbkzquqw). Do not edit by hand.
 *
 * Regenerate after every migration: run that tool again and paste the output here, or
 *   supabase gen types typescript --project-id jybloszaucgqlbkzquqw --schema public > packages/db/src/types.ts
 * and put this comment back on top.
 */
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
      artist_affiliations: {
        Row: {
          artist_slug: string
          created_at: string
          id: string
          kind: string
          name: string
          source_url: string | null
        }
        Insert: {
          artist_slug: string
          created_at?: string
          id?: string
          kind: string
          name: string
          source_url?: string | null
        }
        Update: {
          artist_slug?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_affiliations_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_affiliations_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_aliases: {
        Row: {
          alias: string
          artist_slug: string
          id: string
          kind: string
          source_url: string | null
        }
        Insert: {
          alias: string
          artist_slug: string
          id?: string
          kind?: string
          source_url?: string | null
        }
        Update: {
          alias?: string
          artist_slug?: string
          id?: string
          kind?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_aliases_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_aliases_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_availability: {
        Row: {
          artist_slug: string
          city: string | null
          day: string
          note: string | null
          state: string
          updated_at: string
        }
        Insert: {
          artist_slug: string
          city?: string | null
          day: string
          note?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          artist_slug?: string
          city?: string | null
          day?: string
          note?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_availability_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_availability_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_booking_settings: {
        Row: {
          act_types: string[]
          artist_slug: string
          auto_decline_below_inr: number | null
          cancellation_terms: string | null
          formats: Json
          included: string | null
          min_notice_days: number | null
          rider: string | null
          tech: string | null
          templates: Json
          travel_cities: string[]
          travel_terms: string | null
          travels_anywhere: boolean
          updated_at: string
        }
        Insert: {
          act_types?: string[]
          artist_slug: string
          auto_decline_below_inr?: number | null
          cancellation_terms?: string | null
          formats?: Json
          included?: string | null
          min_notice_days?: number | null
          rider?: string | null
          tech?: string | null
          templates?: Json
          travel_cities?: string[]
          travel_terms?: string | null
          travels_anywhere?: boolean
          updated_at?: string
        }
        Update: {
          act_types?: string[]
          artist_slug?: string
          auto_decline_below_inr?: number | null
          cancellation_terms?: string | null
          formats?: Json
          included?: string | null
          min_notice_days?: number | null
          rider?: string | null
          tech?: string | null
          templates?: Json
          travel_cities?: string[]
          travel_terms?: string | null
          travels_anywhere?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_booking_settings_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_booking_settings_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: true
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_claim_invites: {
        Row: {
          artist_slug: string
          created_at: string
          expires_at: string
          token: string
          used_at: string | null
          used_email: string | null
        }
        Insert: {
          artist_slug: string
          created_at?: string
          expires_at?: string
          token?: string
          used_at?: string | null
          used_email?: string | null
        }
        Update: {
          artist_slug?: string
          created_at?: string
          expires_at?: string
          token?: string
          used_at?: string | null
          used_email?: string | null
        }
        Relationships: []
      }
      artist_connections: {
        Row: {
          artist_a_slug: string
          artist_b_slug: string
          connection_type: string
          created_at: string
          id: string
          notes: string | null
          shared_events: string[]
          shared_venues: string[]
          source_url: string | null
          strength: number
          updated_at: string
        }
        Insert: {
          artist_a_slug: string
          artist_b_slug: string
          connection_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          shared_events?: string[]
          shared_venues?: string[]
          source_url?: string | null
          strength?: number
          updated_at?: string
        }
        Update: {
          artist_a_slug?: string
          artist_b_slug?: string
          connection_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          shared_events?: string[]
          shared_venues?: string[]
          source_url?: string | null
          strength?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_connections_artist_a_slug_fkey"
            columns: ["artist_a_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_connections_artist_a_slug_fkey"
            columns: ["artist_a_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
          {
            foreignKeyName: "artist_connections_artist_b_slug_fkey"
            columns: ["artist_b_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_connections_artist_b_slug_fkey"
            columns: ["artist_b_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_dates: {
        Row: {
          artist_name: string
          artist_slug: string
          city: string
          created_at: string | null
          email: string
          from_date: string
          id: string
          note: string | null
          status: string
          to_date: string
        }
        Insert: {
          artist_name: string
          artist_slug: string
          city: string
          created_at?: string | null
          email: string
          from_date: string
          id?: string
          note?: string | null
          status?: string
          to_date: string
        }
        Update: {
          artist_name?: string
          artist_slug?: string
          city?: string
          created_at?: string | null
          email?: string
          from_date?: string
          id?: string
          note?: string | null
          status?: string
          to_date?: string
        }
        Relationships: []
      }
      artist_discography: {
        Row: {
          artist_id: string | null
          artist_slug: string
          artwork_url: string | null
          bandcamp_item_id: number | null
          bandcamp_item_type: string | null
          bandcamp_url: string | null
          created_at: string
          deezer_album_id: string | null
          deezer_track_id: string | null
          deezer_track_title: string | null
          description: string | null
          id: string
          label: string | null
          release_date: string | null
          release_type: string
          soundcloud_url: string | null
          source_url: string | null
          spotify_url: string | null
          title: string
          updated_at: string
          year: number | null
          youtube_url: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_slug: string
          artwork_url?: string | null
          bandcamp_item_id?: number | null
          bandcamp_item_type?: string | null
          bandcamp_url?: string | null
          created_at?: string
          deezer_album_id?: string | null
          deezer_track_id?: string | null
          deezer_track_title?: string | null
          description?: string | null
          id?: string
          label?: string | null
          release_date?: string | null
          release_type?: string
          soundcloud_url?: string | null
          source_url?: string | null
          spotify_url?: string | null
          title: string
          updated_at?: string
          year?: number | null
          youtube_url?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_slug?: string
          artwork_url?: string | null
          bandcamp_item_id?: number | null
          bandcamp_item_type?: string | null
          bandcamp_url?: string | null
          created_at?: string
          deezer_album_id?: string | null
          deezer_track_id?: string | null
          deezer_track_title?: string | null
          description?: string | null
          id?: string
          label?: string | null
          release_date?: string | null
          release_type?: string
          soundcloud_url?: string | null
          source_url?: string | null
          spotify_url?: string | null
          title?: string
          updated_at?: string
          year?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_discography_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_discography_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_eras: {
        Row: {
          artist_slug: string
          created_at: string
          from_year: number
          id: string
          label: string | null
          palette: string
          sound: string | null
          source_name: string | null
          source_url: string | null
          tags: string[]
          to_year: number | null
        }
        Insert: {
          artist_slug: string
          created_at?: string
          from_year: number
          id?: string
          label?: string | null
          palette?: string
          sound?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[]
          to_year?: number | null
        }
        Update: {
          artist_slug?: string
          created_at?: string
          from_year?: number
          id?: string
          label?: string | null
          palette?: string
          sound?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[]
          to_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_eras_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_eras_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_external_ids: {
        Row: {
          artist_slug: string
          confidence: string
          created_at: string
          evidence: string | null
          id: string
          scheme: string
          url: string | null
          value: string
        }
        Insert: {
          artist_slug: string
          confidence?: string
          created_at?: string
          evidence?: string | null
          id?: string
          scheme: string
          url?: string | null
          value: string
        }
        Update: {
          artist_slug?: string
          confidence?: string
          created_at?: string
          evidence?: string | null
          id?: string
          scheme?: string
          url?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_external_ids_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_external_ids_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_fact_runs: {
        Row: {
          artist_slug: string
          last_run: string
          note: string | null
        }
        Insert: {
          artist_slug: string
          last_run?: string
          note?: string | null
        }
        Update: {
          artist_slug?: string
          last_run?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_fact_runs_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_fact_runs_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: true
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_facts: {
        Row: {
          artist_slug: string
          confidence: string
          created_at: string
          dedupe: string
          detail: string | null
          edited: boolean
          event_date: string | null
          id: string
          label: string
          reviewed_at: string | null
          reviewed_by: string | null
          section: string
          source: string
          status: string
          url: string | null
        }
        Insert: {
          artist_slug: string
          confidence?: string
          created_at?: string
          dedupe: string
          detail?: string | null
          edited?: boolean
          event_date?: string | null
          id?: string
          label: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          section: string
          source: string
          status?: string
          url?: string | null
        }
        Update: {
          artist_slug?: string
          confidence?: string
          created_at?: string
          dedupe?: string
          detail?: string | null
          edited?: boolean
          event_date?: string | null
          id?: string
          label?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string
          source?: string
          status?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_facts_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_facts_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_gigs: {
        Row: {
          artist_slug: string
          b2b_with: string | null
          city: string | null
          created_at: string | null
          event_date: string | null
          event_name: string
          id: string
          role: string | null
          source: string | null
          venue: string | null
          verified: boolean
        }
        Insert: {
          artist_slug: string
          b2b_with?: string | null
          city?: string | null
          created_at?: string | null
          event_date?: string | null
          event_name: string
          id?: string
          role?: string | null
          source?: string | null
          venue?: string | null
          verified?: boolean
        }
        Update: {
          artist_slug?: string
          b2b_with?: string | null
          city?: string | null
          created_at?: string | null
          event_date?: string | null
          event_name?: string
          id?: string
          role?: string | null
          source?: string | null
          venue?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      artist_influences: {
        Row: {
          artist_slug: string
          created_at: string
          id: string
          paraphrase: boolean
          source_url: string
          speaker: string | null
          statement: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          id?: string
          paraphrase?: boolean
          source_url: string
          speaker?: string | null
          statement: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          id?: string
          paraphrase?: boolean
          source_url?: string
          speaker?: string | null
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_influences_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_influences_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_media: {
        Row: {
          artist_slug: string
          author: string | null
          caption: string | null
          created_at: string
          id: string
          kind: string
          license: string | null
          license_url: string | null
          sort: number
          source_url: string | null
          url: string
        }
        Insert: {
          artist_slug: string
          author?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          kind: string
          license?: string | null
          license_url?: string | null
          sort?: number
          source_url?: string | null
          url: string
        }
        Update: {
          artist_slug?: string
          author?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          license?: string | null
          license_url?: string | null
          sort?: number
          source_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_media_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_media_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_milestones: {
        Row: {
          artist_id: string | null
          artist_slug: string
          city: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          importance: number
          is_featured: boolean
          related_artist_name: string | null
          related_artist_slug: string | null
          source_url: string | null
          title: string
          type: string
          updated_at: string
          venue: string | null
          year: number | null
        }
        Insert: {
          artist_id?: string | null
          artist_slug: string
          city?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          importance?: number
          is_featured?: boolean
          related_artist_name?: string | null
          related_artist_slug?: string | null
          source_url?: string | null
          title: string
          type?: string
          updated_at?: string
          venue?: string | null
          year?: number | null
        }
        Update: {
          artist_id?: string | null
          artist_slug?: string
          city?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          importance?: number
          is_featured?: boolean
          related_artist_name?: string | null
          related_artist_slug?: string | null
          source_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          venue?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_milestones_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_milestones_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_packages: {
        Row: {
          artist_id: string
          artist_slug: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_inr: number
          price_is_minimum: boolean
          set_duration_min: number | null
          set_type: string
          sort_order: number
          suitable_for: string[]
          tech_rider: string | null
          travel_included: boolean
          travel_note: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          artist_slug: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_inr?: number
          price_is_minimum?: boolean
          set_duration_min?: number | null
          set_type?: string
          sort_order?: number
          suitable_for?: string[]
          tech_rider?: string | null
          travel_included?: boolean
          travel_note?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artist_slug?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_inr?: number
          price_is_minimum?: boolean
          set_duration_min?: number | null
          set_type?: string
          sort_order?: number
          suitable_for?: string[]
          tech_rider?: string | null
          travel_included?: boolean
          travel_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_packages_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_packages_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_press: {
        Row: {
          artist_id: string | null
          artist_slug: string
          author: string | null
          created_at: string
          date_published: string | null
          excerpt: string | null
          id: string
          is_featured: boolean
          publication: string
          quote_for_epk: string | null
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_slug: string
          author?: string | null
          created_at?: string
          date_published?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          publication: string
          quote_for_epk?: string | null
          title: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_slug?: string
          author?: string | null
          created_at?: string
          date_published?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          publication?: string
          quote_for_epk?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_press_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_press_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_social_stats: {
        Row: {
          artist_id: string | null
          artist_slug: string
          bandcamp_followers: number | null
          captured_at: string
          created_at: string
          id: string
          instagram_followers: number | null
          soundcloud_followers: number | null
          source: string
          spotify_followers: number | null
          spotify_monthly_listeners: number | null
          youtube_subscribers: number | null
        }
        Insert: {
          artist_id?: string | null
          artist_slug: string
          bandcamp_followers?: number | null
          captured_at?: string
          created_at?: string
          id?: string
          instagram_followers?: number | null
          soundcloud_followers?: number | null
          source?: string
          spotify_followers?: number | null
          spotify_monthly_listeners?: number | null
          youtube_subscribers?: number | null
        }
        Update: {
          artist_id?: string | null
          artist_slug?: string
          bandcamp_followers?: number | null
          captured_at?: string
          created_at?: string
          id?: string
          instagram_followers?: number | null
          soundcloud_followers?: number | null
          source?: string
          spotify_followers?: number | null
          spotify_monthly_listeners?: number | null
          youtube_subscribers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_social_stats_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_social_stats_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_sound_tags: {
        Row: {
          artist_slug: string
          created_at: string
          id: string
          source_url: string | null
          tag: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          id?: string
          source_url?: string | null
          tag: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          id?: string
          source_url?: string | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_sound_tags_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_sound_tags_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_submissions: {
        Row: {
          artist_slug: string | null
          based_city: string | null
          bio: string | null
          created_at: string | null
          email: string
          genres: string[] | null
          id: string
          instagram: string | null
          kind: string
          mix_url: string | null
          name: string
          reviewed_at: string | null
          soundcloud: string | null
          status: string
          verify_code: string | null
        }
        Insert: {
          artist_slug?: string | null
          based_city?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          genres?: string[] | null
          id?: string
          instagram?: string | null
          kind: string
          mix_url?: string | null
          name: string
          reviewed_at?: string | null
          soundcloud?: string | null
          status?: string
          verify_code?: string | null
        }
        Update: {
          artist_slug?: string | null
          based_city?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          genres?: string[] | null
          id?: string
          instagram?: string | null
          kind?: string
          mix_url?: string | null
          name?: string
          reviewed_at?: string | null
          soundcloud?: string | null
          status?: string
          verify_code?: string | null
        }
        Relationships: []
      }
      artist_tracklists: {
        Row: {
          artist_slug: string
          created_at: string
          id: string
          mix_title: string
          tracks: Json
          url: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          id?: string
          mix_title: string
          tracks?: Json
          url: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          id?: string
          mix_title?: string
          tracks?: Json
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_tracklists_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_tracklists_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artist_videos: {
        Row: {
          artist_slug: string
          created_at: string
          id: string
          kind: string
          note: string | null
          platform: string | null
          title: string
          url: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          platform?: string | null
          title: string
          url: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          platform?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_videos_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "artist_videos_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
        ]
      }
      artists: {
        Row: {
          airtable_id: string | null
          based_city: string | null
          bio: string | null
          boiler_room: string | null
          booking_email: string | null
          ccd_fit: number | null
          claimed_at: string | null
          claimed_email: string | null
          commercial: string | null
          created_at: string | null
          enrich_sources: Json | null
          enriched_at: string | null
          featured: boolean | null
          fee_currency: string | null
          fee_max_inr: number | null
          fee_min_inr: number | null
          festivals: string[] | null
          from_city: string | null
          genres: string[] | null
          id: string
          instagram: string | null
          is_resident: boolean | null
          kind: string
          labels: string | null
          lane: string
          lane_reason: string | null
          links: Json | null
          mbid: string | null
          members: string | null
          mix_url: string | null
          name: string
          open_to_bookings: boolean | null
          owner_member: string | null
          photo_url: string | null
          played_ccd: boolean | null
          rank: number | null
          slug: string
          soundcloud: string | null
          source: string | null
          spotify: string | null
          status: string
          tier: string | null
          updated_at: string | null
          verified_at: string | null
          verify_note: string | null
          website: string | null
          why: string | null
        }
        Insert: {
          airtable_id?: string | null
          based_city?: string | null
          bio?: string | null
          boiler_room?: string | null
          booking_email?: string | null
          ccd_fit?: number | null
          claimed_at?: string | null
          claimed_email?: string | null
          commercial?: string | null
          created_at?: string | null
          enrich_sources?: Json | null
          enriched_at?: string | null
          featured?: boolean | null
          fee_currency?: string | null
          fee_max_inr?: number | null
          fee_min_inr?: number | null
          festivals?: string[] | null
          from_city?: string | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          is_resident?: boolean | null
          kind?: string
          labels?: string | null
          lane?: string
          lane_reason?: string | null
          links?: Json | null
          mbid?: string | null
          members?: string | null
          mix_url?: string | null
          name: string
          open_to_bookings?: boolean | null
          owner_member?: string | null
          photo_url?: string | null
          played_ccd?: boolean | null
          rank?: number | null
          slug: string
          soundcloud?: string | null
          source?: string | null
          spotify?: string | null
          status?: string
          tier?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verify_note?: string | null
          website?: string | null
          why?: string | null
        }
        Update: {
          airtable_id?: string | null
          based_city?: string | null
          bio?: string | null
          boiler_room?: string | null
          booking_email?: string | null
          ccd_fit?: number | null
          claimed_at?: string | null
          claimed_email?: string | null
          commercial?: string | null
          created_at?: string | null
          enrich_sources?: Json | null
          enriched_at?: string | null
          featured?: boolean | null
          fee_currency?: string | null
          fee_max_inr?: number | null
          fee_min_inr?: number | null
          festivals?: string[] | null
          from_city?: string | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          is_resident?: boolean | null
          kind?: string
          labels?: string | null
          lane?: string
          lane_reason?: string | null
          links?: Json | null
          mbid?: string | null
          members?: string | null
          mix_url?: string | null
          name?: string
          open_to_bookings?: boolean | null
          owner_member?: string | null
          photo_url?: string | null
          played_ccd?: boolean | null
          rank?: number | null
          slug?: string
          soundcloud?: string | null
          source?: string | null
          spotify?: string | null
          status?: string
          tier?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verify_note?: string | null
          website?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_owner_member_fkey"
            columns: ["owner_member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_messages: {
        Row: {
          author_role: string
          body: string | null
          created_at: string
          emailed_at: string | null
          fee_inr: number | null
          id: string
          kind: string
          request_id: string
          set_terms: string | null
        }
        Insert: {
          author_role: string
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          fee_inr?: number | null
          id?: string
          kind?: string
          request_id: string
          set_terms?: string | null
        }
        Update: {
          author_role?: string
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          fee_inr?: number | null
          id?: string
          kind?: string
          request_id?: string
          set_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          accepted_at: string | null
          access_key: string
          artist_emailed_at: string | null
          artist_note: string | null
          artist_response: string | null
          artist_slug: string | null
          budget_band: string | null
          budget_inr: string | null
          budget_max_inr: number | null
          cancelled_at: string | null
          city: string | null
          confirmed_at: string | null
          created_at: string | null
          declined_reason: string | null
          email: string
          event_date: string | null
          event_slug: string | null
          fee_inr: number | null
          group_id: string | null
          id: string
          last_actor: string | null
          member_id: string | null
          message: string | null
          name: string
          notified_at: string | null
          org: string | null
          other_acts: string | null
          responded_at: string | null
          response_emailed_at: string | null
          room_size: number | null
          seen_at: string | null
          set_length: string | null
          set_terms: string | null
          stage: string
          status: string
          terms: Json | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_key?: string
          artist_emailed_at?: string | null
          artist_note?: string | null
          artist_response?: string | null
          artist_slug?: string | null
          budget_band?: string | null
          budget_inr?: string | null
          budget_max_inr?: number | null
          cancelled_at?: string | null
          city?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          declined_reason?: string | null
          email: string
          event_date?: string | null
          event_slug?: string | null
          fee_inr?: number | null
          group_id?: string | null
          id?: string
          last_actor?: string | null
          member_id?: string | null
          message?: string | null
          name: string
          notified_at?: string | null
          org?: string | null
          other_acts?: string | null
          responded_at?: string | null
          response_emailed_at?: string | null
          room_size?: number | null
          seen_at?: string | null
          set_length?: string | null
          set_terms?: string | null
          stage?: string
          status?: string
          terms?: Json | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_key?: string
          artist_emailed_at?: string | null
          artist_note?: string | null
          artist_response?: string | null
          artist_slug?: string | null
          budget_band?: string | null
          budget_inr?: string | null
          budget_max_inr?: number | null
          cancelled_at?: string | null
          city?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          declined_reason?: string | null
          email?: string
          event_date?: string | null
          event_slug?: string | null
          fee_inr?: number | null
          group_id?: string | null
          id?: string
          last_actor?: string | null
          member_id?: string | null
          message?: string | null
          name?: string
          notified_at?: string | null
          org?: string | null
          other_acts?: string | null
          responded_at?: string | null
          response_emailed_at?: string | null
          room_size?: number | null
          seen_at?: string | null
          set_length?: string | null
          set_terms?: string | null
          stage?: string
          status?: string
          terms?: Json | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      booking_reviews: {
        Row: {
          author_role: string
          body: string | null
          created_at: string
          id: string
          rating: number
          request_id: string
        }
        Insert: {
          author_role: string
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          request_id: string
        }
        Update: {
          author_role?: string
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      build_log: {
        Row: {
          area: string
          created_at: string | null
          detail: string | null
          id: number
          link: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          area: string
          created_at?: string | null
          detail?: string | null
          id?: never
          link?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          area?: string
          created_at?: string | null
          detail?: string | null
          id?: never
          link?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          handled_at: string | null
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          handled_at?: string | null
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          handled_at?: string | null
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      crew_checkins: {
        Row: {
          at: string
          member_id: string
          night_key: string
        }
        Insert: {
          at?: string
          member_id: string
          night_key: string
        }
        Update: {
          at?: string
          member_id?: string
          night_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_pool: {
        Row: {
          created_at: string
          crew_id: string | null
          event_slug: string
          member_id: string
        }
        Insert: {
          created_at?: string
          crew_id?: string | null
          event_slug: string
          member_id: string
        }
        Update: {
          created_at?: string
          crew_id?: string | null
          event_slug?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_pool_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_reports: {
        Row: {
          created_at: string
          event_slug: string
          handled_at: string | null
          id: string
          reason: string | null
          reported: string
          reporter: string
          status: string
        }
        Insert: {
          created_at?: string
          event_slug: string
          handled_at?: string | null
          id?: string
          reason?: string | null
          reported: string
          reporter: string
          status?: string
        }
        Update: {
          created_at?: string
          event_slug?: string
          handled_at?: string | null
          id?: string
          reason?: string | null
          reported?: string
          reporter?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_reports_reported_fkey"
            columns: ["reported"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_reports_reporter_fkey"
            columns: ["reporter"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          captain_id: string | null
          created_at: string
          emailed_at: string | null
          entry_sent_at: string | null
          event_slug: string
          id: string
          lost_point: string | null
          meet_point: string | null
          meet_time: string | null
          name: string
          pre_spot: string | null
          whatsapp_link: string | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          emailed_at?: string | null
          entry_sent_at?: string | null
          event_slug: string
          id?: string
          lost_point?: string | null
          meet_point?: string | null
          meet_time?: string | null
          name: string
          pre_spot?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          emailed_at?: string | null
          entry_sent_at?: string | null
          event_slug?: string
          id?: string
          lost_point?: string | null
          meet_point?: string | null
          meet_time?: string | null
          name?: string
          pre_spot?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crews_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          job: string
          ok: boolean | null
          started_at: string | null
          stats: Json | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: never
          job: string
          ok?: boolean | null
          started_at?: string | null
          stats?: Json | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: never
          job?: string
          ok?: boolean | null
          started_at?: string | null
          stats?: Json | null
        }
        Relationships: []
      }
      curation_trust: {
        Row: {
          created_at: string
          kind: string
          note: string | null
          pattern: string
        }
        Insert: {
          created_at?: string
          kind: string
          note?: string | null
          pattern: string
        }
        Update: {
          created_at?: string
          kind?: string
          note?: string | null
          pattern?: string
        }
        Relationships: []
      }
      door_guests: {
        Row: {
          batch: string | null
          checked_in_at: string | null
          checked_in_count: number
          code: string | null
          created_at: string
          email: string | null
          event_slug: string
          id: string
          member_id: string | null
          name: string | null
          party: number
          proof_path: string | null
          source: string
          status: string
          voided_at: string | null
        }
        Insert: {
          batch?: string | null
          checked_in_at?: string | null
          checked_in_count?: number
          code?: string | null
          created_at?: string
          email?: string | null
          event_slug: string
          id?: string
          member_id?: string | null
          name?: string | null
          party?: number
          proof_path?: string | null
          source?: string
          status?: string
          voided_at?: string | null
        }
        Update: {
          batch?: string | null
          checked_in_at?: string | null
          checked_in_count?: number
          code?: string | null
          created_at?: string
          email?: string | null
          event_slug?: string
          id?: string
          member_id?: string | null
          name?: string | null
          party?: number
          proof_path?: string | null
          source?: string
          status?: string
          voided_at?: string | null
        }
        Relationships: []
      }
      door_log: {
        Row: {
          at: string
          by_member: string | null
          client_at: string | null
          delta: number
          device: string | null
          event_slug: string
          id: number
          kind: string
          ref: string
        }
        Insert: {
          at?: string
          by_member?: string | null
          client_at?: string | null
          delta?: number
          device?: string | null
          event_slug: string
          id?: number
          kind: string
          ref: string
        }
        Update: {
          at?: string
          by_member?: string | null
          client_at?: string | null
          delta?: number
          device?: string | null
          event_slug?: string
          id?: number
          kind?: string
          ref?: string
        }
        Relationships: []
      }
      door_settings: {
        Row: {
          age_check: boolean
          event_slug: string
          live_key: string | null
          note: string | null
          updated_at: string
          updated_by: string | null
          upi_name: string | null
          upi_vpa: string | null
        }
        Insert: {
          age_check?: boolean
          event_slug: string
          live_key?: string | null
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_name?: string | null
          upi_vpa?: string | null
        }
        Update: {
          age_check?: boolean
          event_slug?: string
          live_key?: string | null
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_name?: string | null
          upi_vpa?: string | null
        }
        Relationships: []
      }
      door_team: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          event_slug: string
          name: string | null
          role: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          event_slug: string
          name?: string | null
          role?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          event_slug?: string
          name?: string | null
          role?: string
        }
        Relationships: []
      }
      door_walkins: {
        Row: {
          amount_inr: number
          created_at: string
          created_by: string | null
          event_slug: string
          id: string
          method: string
          name: string
          note: string | null
          party: number
          phone: string | null
          voided_at: string | null
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          created_by?: string | null
          event_slug: string
          id?: string
          method?: string
          name: string
          note?: string | null
          party?: number
          phone?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_inr?: number
          created_at?: string
          created_by?: string | null
          event_slug?: string
          id?: string
          method?: string
          name?: string
          note?: string | null
          party?: number
          phone?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      early_access_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          notified_at: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          notified_at?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          notified_at?: string | null
          source?: string | null
        }
        Relationships: []
      }
      event_artists: {
        Row: {
          artist_slug: string
          created_at: string
          event_id: string
          id: string
          match_method: string
          matched_text: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          event_id: string
          id?: string
          match_method: string
          matched_text?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          event_id?: string
          id?: string
          match_method?: string
          matched_text?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "event_artists_artist_slug_fkey"
            columns: ["artist_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["artist_slug"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pending_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scraped_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_going: {
        Row: {
          created_at: string
          event_id: string
          member_id: string
          show_name: boolean
        }
        Insert: {
          created_at?: string
          event_id: string
          member_id: string
          show_name?: boolean
        }
        Update: {
          created_at?: string
          event_id?: string
          member_id?: string
          show_name?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_going_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pending_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_going_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scraped_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_going_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_likes: {
        Row: {
          created_at: string
          event_id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_likes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pending_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_likes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scraped_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_likes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          checked_in_at: string | null
          checked_in_count: number
          created_at: string | null
          email: string
          event_slug: string
          id: string
          name: string
          plus_ones: number | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_count?: number
          created_at?: string | null
          email: string
          event_slug: string
          id?: string
          name: string
          plus_ones?: number | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_count?: number
          created_at?: string | null
          email?: string
          event_slug?: string
          id?: string
          name?: string
          plus_ones?: number | null
        }
        Relationships: []
      }
      event_vouches: {
        Row: {
          created_at: string
          event_id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_vouches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pending_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vouches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scraped_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vouches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_waitlist: {
        Row: {
          created_at: string
          email: string
          event_slug: string
          id: string
          name: string | null
          notified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_slug: string
          id?: string
          name?: string | null
          notified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_slug?: string
          id?: string
          name?: string | null
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_waitlist_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "ccd_gigs"
            referencedColumns: ["event_slug"]
          },
          {
            foreignKeyName: "event_waitlist_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
        ]
      }
      events: {
        Row: {
          blurb: string | null
          capacity: number | null
          city: string | null
          created_at: string | null
          date: string | null
          episode_no: number | null
          event_date: string | null
          event_type: string | null
          genres: string[]
          id: string
          is_finale: boolean | null
          lineup: string[] | null
          listed: boolean
          pet_friendly: boolean | null
          poster_url: string | null
          promoter_id: string | null
          published: boolean | null
          recap: string | null
          review_note: string | null
          review_status: string | null
          rsvp_open: boolean | null
          series: string | null
          series_label: string | null
          series_tagline: string | null
          slug: string
          sort_order: number | null
          start_time: string | null
          status: string | null
          submitted_at: string | null
          ticket_url: string | null
          title: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          blurb?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string | null
          date?: string | null
          episode_no?: number | null
          event_date?: string | null
          event_type?: string | null
          genres?: string[]
          id?: string
          is_finale?: boolean | null
          lineup?: string[] | null
          listed?: boolean
          pet_friendly?: boolean | null
          poster_url?: string | null
          promoter_id?: string | null
          published?: boolean | null
          recap?: string | null
          review_note?: string | null
          review_status?: string | null
          rsvp_open?: boolean | null
          series?: string | null
          series_label?: string | null
          series_tagline?: string | null
          slug: string
          sort_order?: number | null
          start_time?: string | null
          status?: string | null
          submitted_at?: string | null
          ticket_url?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          blurb?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string | null
          date?: string | null
          episode_no?: number | null
          event_date?: string | null
          event_type?: string | null
          genres?: string[]
          id?: string
          is_finale?: boolean | null
          lineup?: string[] | null
          listed?: boolean
          pet_friendly?: boolean | null
          poster_url?: string | null
          promoter_id?: string | null
          published?: boolean | null
          recap?: string | null
          review_note?: string | null
          review_status?: string | null
          rsvp_open?: boolean | null
          series?: string | null
          series_label?: string | null
          series_tagline?: string | null
          slug?: string
          sort_order?: number | null
          start_time?: string | null
          status?: string | null
          submitted_at?: string | null
          ticket_url?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          note: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      form_hits: {
        Row: {
          at: string | null
          email: string | null
          form: string | null
        }
        Insert: {
          at?: string | null
          email?: string | null
          form?: string | null
        }
        Update: {
          at?: string | null
          email?: string | null
          form?: string | null
        }
        Relationships: []
      }
      gate_plans: {
        Row: {
          note: string | null
          plan: string
          pro_until: string | null
          promoter_id: string
          updated_at: string
        }
        Insert: {
          note?: string | null
          plan?: string
          pro_until?: string | null
          promoter_id: string
          updated_at?: string
        }
        Update: {
          note?: string | null
          plan?: string
          pro_until?: string | null
          promoter_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      go_again: {
        Row: {
          created_at: string
          event_slug: string
          from_member: string
          to_member: string
        }
        Insert: {
          created_at?: string
          event_slug: string
          from_member: string
          to_member: string
        }
        Update: {
          created_at?: string
          event_slug?: string
          from_member?: string
          to_member?: string
        }
        Relationships: [
          {
            foreignKeyName: "go_again_from_member_fkey"
            columns: ["from_member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "go_again_to_member_fkey"
            columns: ["to_member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_events: {
        Row: {
          about: string | null
          city: string
          created_at: string
          event_date: string
          event_time: string | null
          genres: string[]
          host_id: string
          id: string
          lineup: string[]
          published_event_id: string | null
          status: string
          ticket_url: string | null
          title: string
          venue: string | null
        }
        Insert: {
          about?: string | null
          city: string
          created_at?: string
          event_date: string
          event_time?: string | null
          genres?: string[]
          host_id: string
          id?: string
          lineup?: string[]
          published_event_id?: string | null
          status?: string
          ticket_url?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          about?: string | null
          city?: string
          created_at?: string
          event_date?: string
          event_time?: string | null
          genres?: string[]
          host_id?: string
          id?: string
          lineup?: string[]
          published_event_id?: string | null
          status?: string
          ticket_url?: string | null
          title?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosted_events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_events_published_event_id_fkey"
            columns: ["published_event_id"]
            isOneToOne: false
            referencedRelation: "pending_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_events_published_event_id_fkey"
            columns: ["published_event_id"]
            isOneToOne: false
            referencedRelation: "scraped_events"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          bandcamp: string | null
          city: string | null
          confidence: string | null
          country: string | null
          created_at: string
          description: string | null
          discogs_url: string | null
          founded: number | null
          founders: string | null
          genres: string[]
          instagram: string | null
          musicbrainz_url: string | null
          name: string
          roster_artist_slugs: string[]
          slug: string
          soundcloud: string | null
          sources: Json
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          bandcamp?: string | null
          city?: string | null
          confidence?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          discogs_url?: string | null
          founded?: number | null
          founders?: string | null
          genres?: string[]
          instagram?: string | null
          musicbrainz_url?: string | null
          name: string
          roster_artist_slugs?: string[]
          slug: string
          soundcloud?: string | null
          sources?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          bandcamp?: string | null
          city?: string | null
          confidence?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          discogs_url?: string | null
          founded?: number | null
          founders?: string | null
          genres?: string[]
          instagram?: string | null
          musicbrainz_url?: string | null
          name?: string
          roster_artist_slugs?: string[]
          slug?: string
          soundcloud?: string | null
          sources?: Json
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      member_follows: {
        Row: {
          artist_slug: string
          created_at: string
          member_id: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          member_id: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_follows_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          banned_at: string | null
          city: string | null
          created_at: string
          display_name: string | null
          email: string
          founding_number: number | null
          genres: string[]
          host_verified: boolean
          id: string
          is_promoter: boolean
          phone: string | null
          quiz: Json | null
          role: string
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
        }
        Insert: {
          banned_at?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          founding_number?: number | null
          genres?: string[]
          host_verified?: boolean
          id: string
          is_promoter?: boolean
          phone?: string | null
          quiz?: Json | null
          role?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
        }
        Update: {
          banned_at?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          founding_number?: number | null
          genres?: string[]
          host_verified?: boolean
          id?: string
          is_promoter?: boolean
          phone?: string | null
          quiz?: Json | null
          role?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
        }
        Relationships: []
      }
      ngos: {
        Row: {
          categories: string[] | null
          city: string | null
          created_at: string | null
          donation: string | null
          focus: string[] | null
          founded: string | null
          founded_by: string | null
          id: string
          impact: string | null
          location: string | null
          name: string
          rank: number | null
          slug: string
          status: string
          website: string | null
        }
        Insert: {
          categories?: string[] | null
          city?: string | null
          created_at?: string | null
          donation?: string | null
          focus?: string[] | null
          founded?: string | null
          founded_by?: string | null
          id?: string
          impact?: string | null
          location?: string | null
          name: string
          rank?: number | null
          slug: string
          status?: string
          website?: string | null
        }
        Update: {
          categories?: string[] | null
          city?: string | null
          created_at?: string | null
          donation?: string | null
          focus?: string[] | null
          founded?: string | null
          founded_by?: string | null
          id?: string
          impact?: string | null
          location?: string | null
          name?: string
          rank?: number | null
          slug?: string
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      night_going: {
        Row: {
          created_at: string
          event_slug: string
          member_id: string
          show_name: boolean
        }
        Insert: {
          created_at?: string
          event_slug: string
          member_id: string
          show_name?: boolean
        }
        Update: {
          created_at?: string
          event_slug?: string
          member_id?: string
          show_name?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "night_going_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      night_likes: {
        Row: {
          created_at: string
          event_slug: string
          member_id: string
        }
        Insert: {
          created_at?: string
          event_slug: string
          member_id: string
        }
        Update: {
          created_at?: string
          event_slug?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "night_likes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      night_plans: {
        Row: {
          created_at: string
          has_ticket: boolean
          member_id: string
          night_key: string
          show_name: boolean
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_ticket?: boolean
          member_id: string
          night_key: string
          show_name?: boolean
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_ticket?: boolean
          member_id?: string
          night_key?: string
          show_name?: boolean
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "night_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      night_ratings: {
        Row: {
          created_at: string
          member_id: string
          night_key: string
          note: string | null
          rating: number
        }
        Insert: {
          created_at?: string
          member_id: string
          night_key: string
          note?: string | null
          rating: number
        }
        Update: {
          created_at?: string
          member_id?: string
          night_key?: string
          note?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "night_ratings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_config: {
        Row: {
          id: number
          token: string
        }
        Insert: {
          id?: number
          token?: string
        }
        Update: {
          id?: number
          token?: string
        }
        Relationships: []
      }
      playlists: {
        Row: {
          created_at: string | null
          embed_id: string
          featured: boolean | null
          id: string
          platform: string
          sort_order: number | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string | null
          embed_id?: string
          featured?: boolean | null
          id?: string
          platform?: string
          sort_order?: number | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string | null
          embed_id?: string
          featured?: boolean | null
          id?: string
          platform?: string
          sort_order?: number | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author: string | null
          body: Json
          category: string | null
          cover_title: string | null
          created_at: string | null
          excerpt: string | null
          extra: Json
          published: boolean
          published_on: string | null
          slug: string
          tag: string | null
          title: string
          tldr: string | null
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          body?: Json
          category?: string | null
          cover_title?: string | null
          created_at?: string | null
          excerpt?: string | null
          extra?: Json
          published?: boolean
          published_on?: string | null
          slug: string
          tag?: string | null
          title: string
          tldr?: string | null
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          body?: Json
          category?: string | null
          cover_title?: string | null
          created_at?: string | null
          excerpt?: string | null
          extra?: Json
          published?: boolean
          published_on?: string | null
          slug?: string
          tag?: string | null
          title?: string
          tldr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      private_contacts: {
        Row: {
          booking_email: string | null
          claimed_email: string | null
          fee_text: string | null
          kind: string
          management: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          booking_email?: string | null
          claimed_email?: string | null
          fee_text?: string | null
          kind: string
          management?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          booking_email?: string | null
          claimed_email?: string | null
          fee_text?: string | null
          kind?: string
          management?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          event_slug: string | null
          expires_on: string | null
          flat_inr: number | null
          max_uses: number | null
          percent: number | null
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          event_slug?: string | null
          expires_on?: string | null
          flat_inr?: number | null
          max_uses?: number | null
          percent?: number | null
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          event_slug?: string | null
          expires_on?: string | null
          flat_inr?: number | null
          max_uses?: number | null
          percent?: number | null
          uses?: number
        }
        Relationships: []
      }
      promoter_applications: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string
          email: string
          genres: string[]
          id: string
          instagram: string | null
          name: string
          reviewed_at: string | null
          sample_event: string | null
          status: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string
          email: string
          genres?: string[]
          id?: string
          instagram?: string | null
          name: string
          reviewed_at?: string | null
          sample_event?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string
          genres?: string[]
          id?: string
          instagram?: string | null
          name?: string
          reviewed_at?: string | null
          sample_event?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      promoter_team: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          promoter_id: string
          removed_at: string | null
          role: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          promoter_id: string
          removed_at?: string | null
          role?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          promoter_id?: string
          removed_at?: string | null
          role?: string
        }
        Relationships: []
      }
      promoters: {
        Row: {
          accent: string
          applied_by: string | null
          blurb: string | null
          cities: string[] | null
          city: string | null
          confidence: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          founded: number | null
          founders: string | null
          genres: string[] | null
          id: string
          instagram: string | null
          kind: string | null
          logo_url: string | null
          name: string
          related_artist_slugs: string[]
          review_note: string | null
          reviewed_at: string | null
          slug: string
          sources: Json
          status: string
          tagline: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accent?: string
          applied_by?: string | null
          blurb?: string | null
          cities?: string[] | null
          city?: string | null
          confidence?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          founded?: number | null
          founders?: string | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          kind?: string | null
          logo_url?: string | null
          name: string
          related_artist_slugs?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          slug: string
          sources?: Json
          status?: string
          tagline?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accent?: string
          applied_by?: string | null
          blurb?: string | null
          cities?: string[] | null
          city?: string | null
          confidence?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          founded?: number | null
          founders?: string | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          kind?: string | null
          logo_url?: string | null
          name?: string
          related_artist_slugs?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          slug?: string
          sources?: Json
          status?: string
          tagline?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failures: number
          last_ok_at: string | null
          member_id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failures?: number
          last_ok_at?: string | null
          member_id: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failures?: number
          last_ok_at?: string | null
          member_id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders_sent: {
        Row: {
          kind: string
          member_id: string
          ref: string
          sent_at: string
        }
        Insert: {
          kind: string
          member_id: string
          ref: string
          sent_at?: string
        }
        Update: {
          kind?: string
          member_id?: string
          ref?: string
          sent_at?: string
        }
        Relationships: []
      }
      scenes: {
        Row: {
          data: Json
          kind: string
          name: string
          slug: string
          tagline: string | null
        }
        Insert: {
          data?: Json
          kind: string
          name: string
          slug: string
          tagline?: string | null
        }
        Update: {
          data?: Json
          kind?: string
          name?: string
          slug?: string
          tagline?: string | null
        }
        Relationships: []
      }
      scoring_keywords: {
        Row: {
          genre: string | null
          keyword: string
          weight: number
        }
        Insert: {
          genre?: string | null
          keyword: string
          weight: number
        }
        Update: {
          genre?: string | null
          keyword?: string
          weight?: number
        }
        Relationships: []
      }
      scraped_events: {
        Row: {
          airtable_id: string | null
          city: string | null
          created_at: string | null
          credible: string[] | null
          description: string | null
          event_date: string | null
          event_time: string | null
          featured: boolean | null
          genres: string[] | null
          id: string
          image_url: string | null
          kind: string
          lineup: string[] | null
          published_at: string | null
          score: number | null
          score_reasons: string[] | null
          source: string
          source_url: string | null
          status: string
          submitter_email: string | null
          ticket_url: string | null
          title: string
          updated_at: string | null
          url: string
          venue: string | null
        }
        Insert: {
          airtable_id?: string | null
          city?: string | null
          created_at?: string | null
          credible?: string[] | null
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          featured?: boolean | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          kind?: string
          lineup?: string[] | null
          published_at?: string | null
          score?: number | null
          score_reasons?: string[] | null
          source: string
          source_url?: string | null
          status?: string
          submitter_email?: string | null
          ticket_url?: string | null
          title: string
          updated_at?: string | null
          url: string
          venue?: string | null
        }
        Update: {
          airtable_id?: string | null
          city?: string | null
          created_at?: string | null
          credible?: string[] | null
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          featured?: boolean | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          kind?: string
          lineup?: string[] | null
          published_at?: string | null
          score?: number | null
          score_reasons?: string[] | null
          source?: string
          source_url?: string | null
          status?: string
          submitter_email?: string | null
          ticket_url?: string | null
          title?: string
          updated_at?: string | null
          url?: string
          venue?: string | null
        }
        Relationships: []
      }
      set_times: {
        Row: {
          artist_name: string
          created_at: string
          ends_at: string | null
          id: string
          night_key: string
          starts_at: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          ends_at?: string | null
          id?: string
          night_key: string
          starts_at: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          night_key?: string
          starts_at?: string
        }
        Relationships: []
      }
      share_events: {
        Row: {
          action: string
          channel: string | null
          created_at: string
          id: number
          kind: string
          ref: string | null
          target: string
        }
        Insert: {
          action: string
          channel?: string | null
          created_at?: string
          id?: number
          kind: string
          ref?: string | null
          target: string
        }
        Update: {
          action?: string
          channel?: string | null
          created_at?: string
          id?: number
          kind?: string
          ref?: string | null
          target?: string
        }
        Relationships: []
      }
      shop_orders: {
        Row: {
          address: Json
          amount_inr: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          id: string
          items: Json
          paid_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          tracking: string | null
        }
        Insert: {
          address: Json
          amount_inr: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          created_at?: string
          id?: string
          items: Json
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          tracking?: string | null
        }
        Update: {
          address?: Json
          amount_inr?: number
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          id?: string
          items?: Json
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          tracking?: string | null
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          images: string[]
          name: string
          price_inr: number
          sizes: string[]
          slug: string
          sort_order: number
          stock: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          name: string
          price_inr: number
          sizes?: string[]
          slug: string
          sort_order?: number
          stock?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          name?: string
          price_inr?: number
          sizes?: string[]
          slug?: string
          sort_order?: number
          stock?: number
        }
        Relationships: []
      }
      show_attendance: {
        Row: {
          artist_slug: string
          created_at: string
          member_id: string
          moment_id: string
        }
        Insert: {
          artist_slug: string
          created_at?: string
          member_id: string
          moment_id: string
        }
        Update: {
          artist_slug?: string
          created_at?: string
          member_id?: string
          moment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_videos: {
        Row: {
          created_at: string | null
          id: string
          is_featured: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          youtube_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          youtube_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          youtube_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          bucket: string
          caption: string | null
          created_at: string
          format: string
          id: string
          ig: Json
          media: Json
          planned_for: string | null
          sources: Json
          status: string
          title: string | null
          updated_at: string
          upload_key: string | null
        }
        Insert: {
          bucket: string
          caption?: string | null
          created_at?: string
          format?: string
          id: string
          ig?: Json
          media?: Json
          planned_for?: string | null
          sources?: Json
          status?: string
          title?: string | null
          updated_at?: string
          upload_key?: string | null
        }
        Update: {
          bucket?: string
          caption?: string | null
          created_at?: string
          format?: string
          id?: string
          ig?: Json
          media?: Json
          planned_for?: string | null
          sources?: Json
          status?: string
          title?: string | null
          updated_at?: string
          upload_key?: string | null
        }
        Relationships: []
      }
      ticket_orders: {
        Row: {
          amount_inr: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          discount_inr: number
          emailed_at: string | null
          event_slug: string
          id: string
          items: Json
          paid_at: string | null
          promo_code: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          refund_note: string | null
          refunded_at: string | null
          source: string
          status: string
        }
        Insert: {
          amount_inr: number
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          discount_inr?: number
          emailed_at?: string | null
          event_slug: string
          id?: string
          items?: Json
          paid_at?: string | null
          promo_code?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_note?: string | null
          refunded_at?: string | null
          source?: string
          status?: string
        }
        Update: {
          amount_inr?: number
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          discount_inr?: number
          emailed_at?: string | null
          event_slug?: string
          id?: string
          items?: Json
          paid_at?: string | null
          promo_code?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_note?: string | null
          refunded_at?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      ticket_proofs: {
        Row: {
          booking_ref: string | null
          created_at: string
          file_path: string | null
          id: string
          member_id: string
          night_key: string
          note: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          booking_ref?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          member_id: string
          night_key: string
          note?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          booking_ref?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          member_id?: string
          night_key?: string
          note?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_proofs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_resend_requests: {
        Row: {
          email: string
          last_at: string
        }
        Insert: {
          email: string
          last_at?: string
        }
        Update: {
          email?: string
          last_at?: string
        }
        Relationships: []
      }
      ticket_swaps: {
        Row: {
          contact: string
          created_at: string
          event_id: string | null
          event_label: string
          face_value_inr: number | null
          id: string
          note: string | null
          status: string
          swap_type: string
          ticket_count: number
          tier: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          event_id?: string | null
          event_label: string
          face_value_inr?: number | null
          id?: string
          note?: string | null
          status?: string
          swap_type: string
          ticket_count?: number
          tier?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          event_id?: string | null
          event_label?: string
          face_value_inr?: number | null
          id?: string
          note?: string | null
          status?: string
          swap_type?: string
          ticket_count?: number
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_swaps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pending_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_swaps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "scraped_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          description: string | null
          event_slug: string
          id: string
          max_per_order: number
          name: string
          price_inr: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          capacity: number
          created_at?: string
          description?: string | null
          event_slug: string
          id?: string
          max_per_order?: number
          name: string
          price_inr: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          description?: string | null
          event_slug?: string
          id?: string
          max_per_order?: number
          name?: string
          price_inr?: number
          sort_order?: number
        }
        Relationships: []
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          code: string
          created_at: string
          event_slug: string
          holder_name: string | null
          id: string
          order_id: string
          out_at: string | null
          tier_id: string | null
          voided_at: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_slug: string
          holder_name?: string | null
          id?: string
          order_id: string
          out_at?: string | null
          tier_id?: string | null
          voided_at?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_slug?: string
          holder_name?: string | null
          id?: string
          order_id?: string
          out_at?: string | null
          tier_id?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_posts: {
        Row: {
          act_name: string
          artist_slug: string | null
          created_at: string
          email: string
          home_city: string | null
          home_country: string | null
          id: string
          instagram: string | null
          kind: string
          note: string | null
          ra: string | null
          reviewed_at: string | null
          spotify: string | null
          status: string
        }
        Insert: {
          act_name: string
          artist_slug?: string | null
          created_at?: string
          email: string
          home_city?: string | null
          home_country?: string | null
          id?: string
          instagram?: string | null
          kind: string
          note?: string | null
          ra?: string | null
          reviewed_at?: string | null
          spotify?: string | null
          status?: string
        }
        Update: {
          act_name?: string
          artist_slug?: string | null
          created_at?: string
          email?: string
          home_city?: string | null
          home_country?: string | null
          id?: string
          instagram?: string | null
          kind?: string
          note?: string | null
          ra?: string | null
          reviewed_at?: string | null
          spotify?: string | null
          status?: string
        }
        Relationships: []
      }
      tour_stops: {
        Row: {
          city: string
          from_date: string
          id: string
          post_id: string
          sort_order: number
          state: string
          ticket_url: string | null
          to_date: string
          venue: string | null
        }
        Insert: {
          city: string
          from_date: string
          id?: string
          post_id: string
          sort_order?: number
          state?: string
          ticket_url?: string | null
          to_date: string
          venue?: string | null
        }
        Update: {
          city?: string
          from_date?: string
          id?: string
          post_id?: string
          sort_order?: number
          state?: string
          ticket_url?: string | null
          to_date?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_stops_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tour_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_venues: {
        Row: {
          bonus: number
          name_pattern: string
        }
        Insert: {
          bonus?: number
          name_pattern: string
        }
        Update: {
          bonus?: number
          name_pattern?: string
        }
        Relationships: []
      }
      venue_partners: {
        Row: {
          active: boolean
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          entry_notes: string | null
          id: string
          name: string
          venue_match: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          entry_notes?: string | null
          id?: string
          name: string
          venue_match: string
        }
        Update: {
          active?: boolean
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          entry_notes?: string | null
          id?: string
          name?: string
          venue_match?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          airtable_id: string | null
          area: string | null
          capacity: number | null
          city: string | null
          created_at: string | null
          genre_focus: string[] | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          airtable_id?: string | null
          area?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string | null
          genre_focus?: string[] | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          airtable_id?: string | null
          area?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string | null
          genre_focus?: string[] | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ccd_gigs: {
        Row: {
          artist_slug: string | null
          city: string | null
          episode_no: number | null
          event_date: string | null
          event_name: string | null
          event_slug: string | null
          venue: string | null
        }
        Relationships: []
      }
      event_appearances: {
        Row: {
          artist_id: string | null
          artist_slug: string | null
          city: string | null
          created_at: string | null
          event_date: string | null
          event_name: string | null
          id: string | null
          role: string | null
          venue: string | null
          year: number | null
        }
        Insert: {
          artist_id?: never
          artist_slug?: string | null
          city?: string | null
          created_at?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string | null
          role?: never
          venue?: string | null
          year?: never
        }
        Update: {
          artist_id?: never
          artist_slug?: string | null
          city?: string | null
          created_at?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string | null
          role?: never
          venue?: string | null
          year?: never
        }
        Relationships: []
      }
      pending_events: {
        Row: {
          city: string | null
          event_date: string | null
          genres: string[] | null
          id: string | null
          score: number | null
          score_reasons: string[] | null
          source: string | null
          title: string | null
          url: string | null
          venue: string | null
        }
        Insert: {
          city?: string | null
          event_date?: string | null
          genres?: string[] | null
          id?: string | null
          score?: number | null
          score_reasons?: string[] | null
          source?: string | null
          title?: string | null
          url?: string | null
          venue?: string | null
        }
        Update: {
          city?: string | null
          event_date?: string | null
          genres?: string[] | null
          id?: string | null
          score?: number | null
          score_reasons?: string[] | null
          source?: string | null
          title?: string | null
          url?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      touring_now: {
        Row: {
          artist_name: string | null
          artist_slug: string | null
          city: string | null
          from_date: string | null
          id: string | null
          note: string | null
          to_date: string | null
        }
        Insert: {
          artist_name?: string | null
          artist_slug?: string | null
          city?: string | null
          from_date?: string | null
          id?: string | null
          note?: string | null
          to_date?: string | null
        }
        Update: {
          artist_name?: string | null
          artist_slug?: string | null
          city?: string | null
          from_date?: string | null
          id?: string | null
          note?: string | null
          to_date?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _adopt_pending: { Args: { p_email: string; p_id: string }; Returns: Json }
      _booking_mask: { Args: { t: string }; Returns: string }
      _booking_reviews_open: { Args: { p_id: string }; Returns: boolean }
      _booking_role: { Args: { p_id: string; p_key: string }; Returns: string }
      _booking_row: {
        Args: {
          b: Database["public"]["Tables"]["booking_requests"]["Row"]
          v_role: string
        }
        Returns: Json
      }
      _clean: { Args: { maxlen: number; t: string }; Returns: string }
      _email_ok: { Args: { e: string }; Returns: boolean }
      _issue_tickets: { Args: { p_order: string }; Returns: undefined }
      _scene_autopublish_all: { Args: never; Returns: number }
      _throttle: {
        Args: { p_email: string; p_form: string; p_max: number }
        Returns: undefined
      }
      _title_words: { Args: { t: string }; Returns: string[] }
      add_my_media: {
        Args: { p_caption?: string; p_kind: string; p_url: string }
        Returns: Json
      }
      add_my_photo: {
        Args: {
          p_caption: string
          p_credit: string
          p_rights: string
          p_url: string
        }
        Returns: Json
      }
      adopt_my_pending: { Args: never; Returns: Json }
      approve_my_facts: { Args: { p_confidence?: string }; Returns: Json }
      artist_availability_public: {
        Args: { p_from: string; p_to: string }
        Returns: {
          artist_slug: string
          city: string
          day: string
          state: string
        }[]
      }
      artist_booking_stats: {
        Args: never
        Returns: {
          answered: number
          artist_slug: string
          confirmed: number
          median_reply_hours: number
        }[]
      }
      artist_directory_extras: { Args: never; Returns: Json }
      artist_gigs: {
        Args: { p_slug: string }
        Returns: {
          city: string
          event_date: string
          event_id: string
          ticket_url: string
          title: string
          url: string
          venue: string
        }[]
      }
      artist_media_public: { Args: { p_slug: string }; Returns: Json }
      artist_profile_public: { Args: { p_slug: string }; Returns: Json }
      artist_reviews_public: { Args: { p_slug: string }; Returns: Json }
      artist_upcoming: { Args: { p_slug: string }; Returns: Json }
      become_artist: {
        Args: {
          p_city: string
          p_claim_slug?: string
          p_genres: string
          p_instagram: string
          p_mix_url: string
          p_name: string
          p_soundcloud: string
        }
        Returns: Json
      }
      become_host: { Args: never; Returns: Json }
      become_promoter: {
        Args: {
          p_bio: string
          p_city: string
          p_instagram: string
          p_name: string
        }
        Returns: Json
      }
      booking_act: {
        Args: {
          p_action: string
          p_fee_inr?: number
          p_id: string
          p_key: string
          p_note?: string
          p_set_terms?: string
        }
        Returns: Json
      }
      booking_post: {
        Args: { p_body: string; p_id: string; p_key: string }
        Returns: Json
      }
      booking_review: {
        Args: { p_body: string; p_id: string; p_key: string; p_rating: number }
        Returns: Json
      }
      booking_settings_public: {
        Args: never
        Returns: {
          act_types: string[]
          artist_slug: string
          cancellation_terms: string
          formats: Json
          included: string
          min_notice_days: number
          rider: string
          tech: string
          travel_cities: string[]
          travel_terms: string
          travels_anywhere: boolean
        }[]
      }
      booking_thread: { Args: { p_id: string; p_key?: string }; Returns: Json }
      booking_threads_by_keys: { Args: { p_keys: string[] }; Returns: Json }
      build_internal_facts: { Args: never; Returns: number }
      captain_set_crew: {
        Args: {
          p_key: string
          p_lost_point?: string
          p_meet_point: string
          p_meet_time: string
          p_whatsapp: string
        }
        Returns: Json
      }
      check_promo: {
        Args: { p_code: string; p_slug: string; p_subtotal: number }
        Returns: Json
      }
      checkin_ticket: { Args: { p_code: string }; Returns: Json }
      city_norm: { Args: { p: string }; Returns: string }
      claim_founding_pass: { Args: never; Returns: Json }
      claim_invite_info: { Args: { p_token: string }; Returns: Json }
      claim_with_invite: { Args: { p_token: string }; Returns: Json }
      create_shop_order: {
        Args: {
          p_address: Json
          p_email: string
          p_items: Json
          p_name: string
          p_phone: string
        }
        Returns: Json
      }
      create_ticket_order: {
        Args: {
          p_email: string
          p_items: Json
          p_name: string
          p_phone: string
          p_promo?: string
          p_slug: string
          p_source?: string
        }
        Returns: Json
      }
      crew_friendly_venues: {
        Args: never
        Returns: {
          city: string
          name: string
          venue_match: string
        }[]
      }
      door_can:
        | { Args: never; Returns: boolean }
        | { Args: { p_slug: string }; Returns: boolean }
      door_can_lead: { Args: { p_slug: string }; Returns: boolean }
      door_check_guest: {
        Args: {
          p_client_at?: string
          p_code: string
          p_device?: string
          p_slug: string
        }
        Returns: Json
      }
      door_checkin: {
        Args: {
          p_client_at?: string
          p_code: string
          p_device?: string
          p_slug: string
        }
        Returns: Json
      }
      door_guest_set: {
        Args: {
          p_client_at?: string
          p_count: number
          p_device?: string
          p_id: string
          p_slug: string
        }
        Returns: Json
      }
      door_guests_list: { Args: { p_slug: string }; Returns: Json }
      door_import_guests: {
        Args: { p_rows: Json; p_slug: string; p_source: string }
        Returns: Json
      }
      door_list: { Args: { p_slug: string }; Returns: Json }
      door_live: { Args: { p_key: string }; Returns: Json }
      door_live_link: {
        Args: { p_reset?: boolean; p_slug: string }
        Returns: Json
      }
      door_me_email: { Args: never; Returns: string }
      door_nights: { Args: never; Returns: Json }
      door_passout: {
        Args: {
          p_client_at?: string
          p_code: string
          p_device?: string
          p_slug: string
        }
        Returns: Json
      }
      door_report: { Args: { p_slug: string }; Returns: Json }
      door_rsvp: {
        Args: {
          p_client_at?: string
          p_count: number
          p_device?: string
          p_id: string
          p_slug: string
        }
        Returns: Json
      }
      door_save_settings: {
        Args: {
          p_age_check: boolean
          p_note: string
          p_slug: string
          p_upi_name: string
          p_upi_vpa: string
        }
        Returns: Json
      }
      door_setup: { Args: { p_slug: string }; Returns: Json }
      door_team_set: {
        Args: {
          p_email: string
          p_name?: string
          p_remove?: boolean
          p_role: string
          p_slug: string
        }
        Returns: Json
      }
      door_undo_ticket: {
        Args: { p_code: string; p_device?: string; p_slug: string }
        Returns: Json
      }
      door_void_import: {
        Args: { p_batch: string; p_slug: string }
        Returns: Json
      }
      door_void_walkin: {
        Args: { p_device?: string; p_id: string; p_slug: string }
        Returns: Json
      }
      door_walkin: {
        Args: {
          p_amount?: number
          p_client_at?: string
          p_device?: string
          p_id: string
          p_method?: string
          p_name: string
          p_note?: string
          p_party?: number
          p_phone?: string
          p_slug: string
        }
        Returns: Json
      }
      drop_push_subscription: { Args: { p_endpoint: string }; Returns: Json }
      event_attendees: {
        Args: { p_event_id: string }
        Returns: {
          city: string
          display_name: string
          total: number
        }[]
      }
      event_counts: {
        Args: never
        Returns: {
          event_id: string
          going: number
          likes: number
        }[]
      }
      event_tiers: {
        Args: { p_slug: string }
        Returns: {
          capacity: number
          description: string
          id: string
          max_per_order: number
          name: string
          price_inr: number
          remaining: number
          sold_out: boolean
        }[]
      }
      follow_artist: {
        Args: { p_follow?: boolean; p_slug: string }
        Returns: Json
      }
      gate_code: { Args: { t: string }; Returns: string }
      gate_limits: { Args: { p_slug: string }; Returns: Json }
      generate_weekly_digest: { Args: never; Returns: string }
      guest_add_ticket: {
        Args: {
          p_code: string
          p_party?: number
          p_path?: string
          p_slug: string
          p_source: string
        }
        Returns: Json
      }
      guest_list: { Args: { p_slug: string }; Returns: Json }
      i_was_there_counts: {
        Args: { p_slug: string }
        Returns: {
          count: number
          moment_id: string
        }[]
      }
      join_crew_pool: { Args: { p_slug: string }; Returns: Json }
      join_crew_pool_any: { Args: { p_key: string }; Returns: Json }
      join_event_waitlist: {
        Args: { p_email: string; p_name: string; p_slug: string }
        Returns: Json
      }
      join_member: {
        Args: { p_city: string; p_genres: string[]; p_name: string }
        Returns: Json
      }
      leave_crew_pool: { Args: { p_key: string }; Returns: Json }
      lineup_norm: { Args: { p: string }; Returns: string }
      lineup_parts: { Args: { p: string }; Returns: string[] }
      log_share: {
        Args: {
          p_action: string
          p_channel?: string
          p_kind: string
          p_ref?: string
          p_target: string
        }
        Returns: undefined
      }
      mark_im_in: { Args: { p_key: string }; Returns: Json }
      match_event_artists: { Args: { p_event: string }; Returns: number }
      member_vouch: { Args: { p_event_id: string }; Returns: Json }
      my_artist: { Args: never; Returns: Json }
      my_artist_facts: { Args: never; Returns: Json }
      my_booking_requests: { Args: never; Returns: Json }
      my_booking_settings: { Args: never; Returns: Json }
      my_booking_threads: { Args: never; Returns: Json }
      my_bookings: { Args: never; Returns: Json }
      my_calendar: { Args: { p_from: string; p_to: string }; Returns: Json }
      my_claims: { Args: never; Returns: Json }
      my_crew: {
        Args: { p_slug: string }
        Returns: {
          crew_name: string
          is_captain: boolean
          mate: string
          pre_spot: string
        }[]
      }
      my_crew_card: { Args: { p_key: string }; Returns: Json }
      my_crew_mates: {
        Args: { p_slug: string }
        Returns: {
          mate: string
          mate_id: string
          tapped: boolean
        }[]
      }
      my_crew_status: { Args: { p_slug: string }; Returns: Json }
      my_event_state: {
        Args: never
        Returns: {
          event_id: string
          going: boolean
          liked: boolean
          show_name: boolean
        }[]
      }
      my_feed: {
        Args: never
        Returns: {
          city: string
          event_date: string
          event_time: string
          genres: string[]
          id: string
          kind: string
          lineup: string[]
          match_score: number
          ticket_url: string
          title: string
          url: string
          venue: string
          why: string
        }[]
      }
      my_i_was_there: { Args: { p_slug: string }; Returns: string[] }
      my_media: { Args: never; Returns: Json }
      my_member_tickets: {
        Args: never
        Returns: {
          checked_in: boolean
          code: string
          event_date: string
          event_slug: string
          event_title: string
          holder_name: string
          order_id: string
          status: string
          tier: string
          venue: string
        }[]
      }
      my_night_state: {
        Args: never
        Returns: {
          event_slug: string
          going: boolean
          liked: boolean
          show_name: boolean
        }[]
      }
      my_outside_ticket: { Args: { p_slug: string }; Returns: Json }
      my_past_crews: {
        Args: never
        Returns: {
          event_date: string
          event_slug: string
          title: string
        }[]
      }
      my_people_going: {
        Args: never
        Returns: {
          night_key: string
          people: number
        }[]
      }
      my_plans: {
        Args: never
        Returns: {
          city: string
          event_date: string
          has_ticket: boolean
          kind: string
          night_key: string
          show_name: boolean
          state: string
          title: string
          venue: string
        }[]
      }
      my_promoters: { Args: never; Returns: Json }
      my_reminders: { Args: never; Returns: Json }
      my_roles: { Args: never; Returns: Json }
      my_standing: { Args: never; Returns: Json }
      my_tickets: {
        Args: { p_email: string; p_order: string }
        Returns: {
          checked_in: boolean
          code: string
          event_date: string
          event_slug: string
          event_title: string
          holder_name: string
          status: string
          tier: string
          venue: string
        }[]
      }
      night_buzz: { Args: { p_slug: string }; Returns: Json }
      night_counts: {
        Args: never
        Returns: {
          event_slug: string
          going: number
          likes: number
        }[]
      }
      night_crowd: {
        Args: { p_keys: string[] }
        Returns: {
          going: number
          interested: number
          names: string[]
          night_key: string
        }[]
      }
      night_info: {
        Args: { p_key: string }
        Returns: {
          city: string
          event_date: string
          kind: string
          night_key: string
          open: boolean
          title: string
          venue: string
        }[]
      }
      night_set_times: {
        Args: { p_key: string }
        Returns: {
          artist_name: string
          ends_at: string
          starts_at: string
        }[]
      }
      ops_add_artist_photo: {
        Args: {
          p_author: string
          p_license: string
          p_license_url: string
          p_set_profile?: boolean
          p_slug: string
          p_source_url: string
          p_token: string
          p_url: string
        }
        Returns: Json
      }
      ops_add_event_artist: {
        Args: { p_event: string; p_slug: string; p_token: string }
        Returns: Json
      }
      ops_add_releases: {
        Args: { p_rows: Json; p_token: string }
        Returns: Json
      }
      ops_approve_facts_bulk: {
        Args: { p_confidence?: string; p_section?: string; p_token: string }
        Returns: Json
      }
      ops_artist_facts: {
        Args: {
          p_limit?: number
          p_slug?: string
          p_status?: string
          p_token: string
        }
        Returns: Json
      }
      ops_artist_facts_summary: { Args: { p_token: string }; Returns: Json }
      ops_artist_worklist: { Args: { p_token: string }; Returns: Json }
      ops_artists: {
        Args: { p_status?: string; p_token: string }
        Returns: Json
      }
      ops_attach_razorpay: {
        Args: { p_order: string; p_rzp: string; p_token: string }
        Returns: Json
      }
      ops_booking_answers: { Args: { p_token: string }; Returns: Json }
      ops_booking_outbox: { Args: { p_token: string }; Returns: Json }
      ops_booking_pipeline: { Args: { p_token: string }; Returns: Json }
      ops_booking_set_stage: {
        Args: {
          p_id: string
          p_note?: string
          p_stage: string
          p_token: string
        }
        Returns: Json
      }
      ops_booking_unnotified: { Args: { p_token: string }; Returns: Json }
      ops_build_internal_facts: { Args: { p_token: string }; Returns: Json }
      ops_bulk_artists: {
        Args: { p_from: string; p_to: string; p_token: string }
        Returns: Json
      }
      ops_check: { Args: { p_token: string }; Returns: undefined }
      ops_city_waitlist: { Args: { p_token: string }; Returns: Json }
      ops_city_waitlist_done: {
        Args: { p_city: string; p_token: string }
        Returns: Json
      }
      ops_claim_checks: { Args: { p_token: string }; Returns: Json }
      ops_claim_invite: {
        Args: { p_slug: string; p_token: string }
        Returns: Json
      }
      ops_claim_invites: { Args: { p_token: string }; Returns: Json }
      ops_confirm_candidate: {
        Args: { p_id: string; p_token: string }
        Returns: Json
      }
      ops_contact_messages: { Args: { p_token: string }; Returns: Json }
      ops_crew_email_list: {
        Args: { p_slug: string; p_token: string }
        Returns: Json
      }
      ops_crew_entry_list: {
        Args: { p_key: string; p_token: string }
        Returns: Json
      }
      ops_crew_nights: {
        Args: { p_token: string }
        Returns: {
          city: string
          crews: number
          entry_sent_at: string
          event_date: string
          members: number
          night_key: string
          partner: string
          partner_email: string
          pool_waiting: number
          title: string
          venue: string
          verified: number
        }[]
      }
      ops_crew_overview: { Args: { p_token: string }; Returns: Json }
      ops_crew_reports: { Args: { p_token: string }; Returns: Json }
      ops_curation_bulk: {
        Args: { p_ids: string[]; p_to: string; p_token: string }
        Returns: Json
      }
      ops_curation_counts: { Args: { p_token: string }; Returns: Json }
      ops_curation_list: {
        Args: {
          p_commercial?: string
          p_has_photo?: boolean
          p_limit?: number
          p_min_fit?: number
          p_status?: string
          p_token: string
          p_unscored?: boolean
        }
        Returns: Json
      }
      ops_curation_trust_list: { Args: { p_token: string }; Returns: Json }
      ops_curation_trust_set: {
        Args: {
          p_kind: string
          p_note?: string
          p_pattern: string
          p_remove?: boolean
          p_token: string
        }
        Returns: Json
      }
      ops_deezer_artists: { Args: { p_token: string }; Returns: Json }
      ops_discover_artists: { Args: { p_token: string }; Returns: Json }
      ops_due_reminders: { Args: { p_token: string }; Returns: Json }
      ops_event_artists: {
        Args: { p_future?: boolean; p_status?: string; p_token: string }
        Returns: Json
      }
      ops_event_waitlist: {
        Args: { p_slug: string; p_token: string }
        Returns: {
          created_at: string
          email: string
          name: string
          notified_at: string
        }[]
      }
      ops_export: { Args: { p_token: string }; Returns: Json }
      ops_form_crews: {
        Args: { p_pre_spot?: string; p_slug: string; p_token: string }
        Returns: Json
      }
      ops_gate_plans: { Args: { p_token: string }; Returns: Json }
      ops_inbox: { Args: { p_token: string }; Returns: Json }
      ops_mark_booking_answer_emailed: {
        Args: { p_id: string; p_token: string }
        Returns: Json
      }
      ops_mark_crews_emailed: {
        Args: { p_slug: string; p_token: string }
        Returns: Json
      }
      ops_mark_entry_sent: {
        Args: { p_key: string; p_token: string }
        Returns: Json
      }
      ops_mark_order_emailed: {
        Args: { p_order: string; p_token: string }
        Returns: Json
      }
      ops_mark_order_paid: {
        Args: { p_payment: string; p_rzp_order: string; p_token: string }
        Returns: Json
      }
      ops_mark_reminders: {
        Args: { p_dead: string[]; p_sent: Json; p_token: string }
        Returns: Json
      }
      ops_members: { Args: { p_token: string }; Returns: Json }
      ops_order_amount: {
        Args: { p_order: string; p_token: string }
        Returns: Json
      }
      ops_order_email_data: {
        Args: { p_order: string; p_token: string }
        Returns: Json
      }
      ops_order_resend_data: {
        Args: { p_order: string; p_token: string }
        Returns: Json
      }
      ops_orders_for_email: {
        Args: { p_email: string; p_token: string }
        Returns: Json
      }
      ops_promos: { Args: { p_token: string }; Returns: Json }
      ops_promoter_mail_data: {
        Args: { p_night?: string; p_promoter?: string; p_token: string }
        Returns: Json
      }
      ops_promoter_queue: { Args: { p_token: string }; Returns: Json }
      ops_propose_facts: {
        Args: { p_facts: Json; p_token: string }
        Returns: Json
      }
      ops_queues: { Args: { p_token: string }; Returns: Json }
      ops_recent_orders: { Args: { p_token: string }; Returns: Json }
      ops_refund_order: {
        Args: { p_note?: string; p_order: string; p_token: string }
        Returns: Json
      }
      ops_rematch_event_artists: { Args: { p_token: string }; Returns: Json }
      ops_remove_photo: {
        Args: { p_id: string; p_token: string }
        Returns: Json
      }
      ops_resolve_report: {
        Args: { p_action: string; p_id: string; p_token: string }
        Returns: Json
      }
      ops_review: {
        Args: {
          p_action: string
          p_id: string
          p_kind: string
          p_token: string
        }
        Returns: undefined
      }
      ops_review_fact: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: Json
      }
      ops_review_night: {
        Args: {
          p_approve: boolean
          p_note?: string
          p_slug: string
          p_token: string
        }
        Returns: Json
      }
      ops_review_promoter: {
        Args: {
          p_approve: boolean
          p_id: string
          p_note?: string
          p_token: string
        }
        Returns: Json
      }
      ops_scene_credibility: {
        Args: { p_ids: string[]; p_token: string }
        Returns: Json
      }
      ops_set_artist_photos: {
        Args: { p_overwrite?: boolean; p_rows: Json; p_token: string }
        Returns: Json
      }
      ops_set_artist_status: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: Json
      }
      ops_set_curation: {
        Args: {
          p_commercial: string
          p_fit: number
          p_id: string
          p_note: string
          p_token: string
        }
        Returns: Json
      }
      ops_set_event_artist: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: Json
      }
      ops_set_event_status: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: undefined
      }
      ops_set_flag: {
        Args: { p_enabled: boolean; p_key: string; p_token: string }
        Returns: undefined
      }
      ops_set_gate_plan: {
        Args: {
          p_note?: string
          p_plan: string
          p_promoter: string
          p_token: string
          p_until?: string
        }
        Returns: Json
      }
      ops_set_inbox_status: {
        Args: {
          p_id: string
          p_kind: string
          p_status: string
          p_token: string
        }
        Returns: Json
      }
      ops_set_member_role: {
        Args: { p_email: string; p_role: string; p_token: string }
        Returns: Json
      }
      ops_set_photo_rights: {
        Args: {
          p_author: string
          p_id: string
          p_license: string
          p_license_url: string
          p_source_url: string
          p_token: string
        }
        Returns: Json
      }
      ops_set_setting: {
        Args: { p_key: string; p_token: string; p_value: Json }
        Returns: undefined
      }
      ops_set_swap_status: {
        Args: { p_id: string; p_status: string; p_token: string }
        Returns: Json
      }
      ops_set_times: {
        Args: { p_key: string; p_rows: Json; p_token: string }
        Returns: Json
      }
      ops_share_stats: { Args: { p_token: string }; Returns: Json }
      ops_shop_attach_razorpay: {
        Args: { p_order: string; p_rzp: string; p_token: string }
        Returns: Json
      }
      ops_shop_mark_paid: {
        Args: { p_payment: string; p_rzp_order: string; p_token: string }
        Returns: Json
      }
      ops_shop_order_amount: {
        Args: { p_order: string; p_token: string }
        Returns: Json
      }
      ops_shop_orders: { Args: { p_token: string }; Returns: Json }
      ops_shop_ship: {
        Args: { p_order: string; p_token: string; p_tracking: string }
        Returns: Json
      }
      ops_snapshot: { Args: { p_token: string }; Returns: Json }
      ops_swaps: { Args: { p_token: string }; Returns: Json }
      ops_ticket_summary: { Args: { p_token: string }; Returns: Json }
      ops_todos: { Args: { p_token: string }; Returns: Json }
      ops_tour_posts: {
        Args: { p_status?: string; p_token: string }
        Returns: Json
      }
      ops_tour_review: {
        Args: {
          p_artist_slug?: string
          p_id: string
          p_status: string
          p_token: string
        }
        Returns: Json
      }
      ops_upsert_product: {
        Args: {
          p_active: boolean
          p_description: string
          p_image: string
          p_name: string
          p_price: number
          p_sizes: string[]
          p_slug: string
          p_stock: number
          p_token: string
        }
        Returns: Json
      }
      ops_upsert_promo: {
        Args: {
          p_active?: boolean
          p_code: string
          p_expires: string
          p_flat: number
          p_max: number
          p_percent: number
          p_slug: string
          p_token: string
        }
        Returns: Json
      }
      ops_upsert_tier: {
        Args: {
          p_capacity: number
          p_name: string
          p_price: number
          p_slug: string
          p_token: string
        }
        Returns: Json
      }
      ops_upsert_venue_partner: {
        Args: {
          p_active: boolean
          p_city: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_entry_notes: string
          p_id: string
          p_match: string
          p_name: string
          p_token: string
        }
        Returns: Json
      }
      ops_venue_partners: {
        Args: { p_token: string }
        Returns: {
          active: boolean
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          entry_notes: string | null
          id: string
          name: string
          venue_match: string
        }[]
        SetofOptions: {
          from: "*"
          to: "venue_partners"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pending_hosted_events: {
        Args: never
        Returns: {
          about: string
          city: string
          event_date: string
          host_email: string
          host_name: string
          id: string
          lineup: string[]
          ticket_url: string
          title: string
          venue: string
        }[]
      }
      promoter_apply: {
        Args: {
          p_blurb: string
          p_city: string
          p_genres?: string[]
          p_instagram: string
          p_name: string
          p_website: string
        }
        Returns: Json
      }
      promoter_get: { Args: { p_slug: string }; Returns: Json }
      promoter_night_save: {
        Args: { p_data: Json; p_night: string; p_slug: string }
        Returns: Json
      }
      promoter_night_status: {
        Args: { p_action: string; p_night: string }
        Returns: Json
      }
      promoter_page: { Args: { p_slug: string }; Returns: Json }
      promoter_qualifies: {
        Args: { p: Database["public"]["Tables"]["promoters"]["Row"] }
        Returns: boolean
      }
      promoter_role: { Args: { p_promoter: string }; Returns: string }
      promoter_save: { Args: { p_data: Json; p_slug: string }; Returns: Json }
      promoter_slugify: { Args: { p: string }; Returns: string }
      promoter_team_set: {
        Args: {
          p_email: string
          p_remove?: boolean
          p_role: string
          p_slug: string
        }
        Returns: Json
      }
      promoters_public: {
        Args: never
        Returns: {
          accent: string
          blurb: string
          cities: string[]
          city: string
          genres: string[]
          instagram: string
          kind: string
          logo_url: string
          name: string
          nights_on_ccd: number
          slug: string
          tagline: string
          website: string
        }[]
      }
      public_products: {
        Args: never
        Returns: {
          description: string
          id: string
          images: string[]
          in_stock: boolean
          name: string
          price_inr: number
          sizes: string[]
          slug: string
        }[]
      }
      public_stats: { Args: never; Returns: Json }
      public_ticket_swaps: {
        Args: never
        Returns: {
          created_at: string
          event_label: string
          face_value_inr: number
          id: string
          note: string
          swap_type: string
          ticket_count: number
          tier: string
        }[]
      }
      public_tiers: {
        Args: { p_slug: string }
        Returns: {
          id: string
          max_per_order: number
          name: string
          price_inr: number
          remaining: number
        }[]
      }
      rate_night: {
        Args: { p_key: string; p_note?: string; p_rating: number }
        Returns: Json
      }
      remove_my_media: { Args: { p_id: string }; Returns: Json }
      report_crew_mate: {
        Args: { p_member: string; p_reason: string; p_slug: string }
        Returns: Json
      }
      request_booking: {
        Args: {
          p_artist_slug: string
          p_budget: string
          p_city: string
          p_date: string
          p_email: string
          p_event_slug?: string
          p_message: string
          p_name: string
          p_org: string
        }
        Returns: Json
      }
      request_booking_v2: {
        Args: {
          p_artist_slugs: string[]
          p_budget_band?: string
          p_budget_max_inr?: number
          p_city: string
          p_date: string
          p_email: string
          p_event_slug?: string
          p_hp?: string
          p_message?: string
          p_name: string
          p_org: string
          p_other_acts?: string
          p_room_size?: number
          p_set_length?: string
          p_venue?: string
        }
        Returns: Json
      }
      respond_booking: {
        Args: { p_id: string; p_note?: string; p_response: string }
        Returns: Json
      }
      review_hosted_event: {
        Args: { p_approve: boolean; p_id: string }
        Returns: Json
      }
      review_my_fact: {
        Args: {
          p_detail?: string
          p_id: string
          p_label?: string
          p_status: string
        }
        Returns: Json
      }
      rsvp: {
        Args: {
          p_email: string
          p_event_slug: string
          p_name: string
          p_plus_ones?: number
        }
        Returns: Json
      }
      rsvp_count: { Args: { p_event_slug: string }; Returns: number }
      save_my_booking_settings: { Args: { p: Json }; Returns: Json }
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: Json
      }
      save_taste_quiz: {
        Args: { p_answers: Json; p_phone?: string }
        Returns: Json
      }
      say_go_again: { Args: { p_slug: string; p_to: string }; Returns: Json }
      scene_credibility: {
        Args: {
          p_description: string
          p_genres: string[]
          p_lineup: string[]
          p_title: string
          p_venue: string
        }
        Returns: string[]
      }
      scene_dupe_of: {
        Args: { p_city: string; p_date: string; p_id: string; p_title: string }
        Returns: string
      }
      scene_events: {
        Args: { p_kind?: string }
        Returns: {
          city: string
          event_date: string
          event_time: string
          featured: boolean
          genres: string[]
          id: string
          kind: string
          lineup: string[]
          source: string
          ticket_url: string
          title: string
          url: string
          venue: string
        }[]
      }
      scene_is_credible: { Args: { p: string[] }; Returns: boolean }
      scene_should_autopublish: {
        Args: { e: Database["public"]["Tables"]["scraped_events"]["Row"] }
        Returns: boolean
      }
      set_going: {
        Args: { p_event_id: string; p_going: boolean; p_show_name?: boolean }
        Returns: Json
      }
      set_i_was_there: {
        Args: { p_moment: string; p_on: boolean; p_slug: string }
        Returns: Json
      }
      set_my_day: {
        Args: {
          p_city?: string
          p_day: string
          p_note?: string
          p_state: string
        }
        Returns: Json
      }
      set_my_phone: { Args: { p_phone: string }; Returns: Json }
      set_night_going: {
        Args: { p_going: boolean; p_show_name?: boolean; p_slug: string }
        Returns: Json
      }
      set_plan: {
        Args: {
          p_has_ticket?: boolean
          p_key: string
          p_show_name?: boolean
          p_state: string
        }
        Returns: Json
      }
      set_whatsapp_opt_in: {
        Args: { p_on: boolean; p_phone?: string }
        Returns: Json
      }
      signup: { Args: { p_email: string; p_source?: string }; Returns: Json }
      staff_set_ticket_proof: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      staff_ticket_proofs: {
        Args: { p_key?: string }
        Returns: {
          booking_ref: string
          created_at: string
          file_path: string
          id: string
          member_name: string
          night_key: string
          status: string
          title: string
        }[]
      }
      submit_artist: {
        Args: {
          p_artist_slug: string
          p_bio: string
          p_city: string
          p_email: string
          p_genres: string
          p_instagram: string
          p_kind: string
          p_mix_url: string
          p_name: string
          p_soundcloud: string
        }
        Returns: Json
      }
      submit_contact: {
        Args: { p_email: string; p_message: string; p_name: string }
        Returns: Json
      }
      submit_dates: {
        Args: {
          p_artist_name: string
          p_artist_slug?: string
          p_city: string
          p_email: string
          p_from: string
          p_note?: string
          p_to: string
        }
        Returns: Json
      }
      submit_event: {
        Args: {
          p_city: string
          p_date: string
          p_description?: string
          p_email: string
          p_time?: string
          p_title: string
          p_url: string
          p_venue: string
        }
        Returns: Json
      }
      submit_event_v2: {
        Args: {
          p_city: string
          p_date: string
          p_description?: string
          p_email: string
          p_hp?: string
          p_lineup?: string
          p_promoter?: string
          p_time?: string
          p_title: string
          p_url: string
          p_venue: string
        }
        Returns: Json
      }
      submit_hosted_event: {
        Args: {
          p_about: string
          p_city: string
          p_date: string
          p_genres: string[]
          p_lineup: string[]
          p_ticket_url: string
          p_time: string
          p_title: string
          p_venue: string
        }
        Returns: Json
      }
      submit_promoter_application: {
        Args: {
          p_bio: string
          p_city: string
          p_email: string
          p_genres: string
          p_instagram: string
          p_name: string
          p_sample_event: string
          p_website: string
        }
        Returns: Json
      }
      submit_ticket_proof: {
        Args: { p_key: string; p_path: string; p_ref: string }
        Returns: Json
      }
      submit_ticket_swap: {
        Args: {
          p_contact: string
          p_event_id?: string
          p_event_label: string
          p_face_value_inr: number
          p_note: string
          p_swap_type: string
          p_ticket_count: number
          p_tier: string
        }
        Returns: Json
      }
      submit_tour: {
        Args: {
          p_act_name: string
          p_company?: string
          p_email: string
          p_home_city: string
          p_home_country: string
          p_instagram: string
          p_kind: string
          p_note: string
          p_ra: string
          p_spotify: string
          p_stops: Json
        }
        Returns: Json
      }
      tidy_scene_title: { Args: { t: string }; Returns: string }
      toggle_like: { Args: { p_event_id: string }; Returns: Json }
      toggle_night_like: { Args: { p_slug: string }; Returns: Json }
      tour_board: {
        Args: { p_city?: string }
        Returns: {
          artist_name: string
          artist_slug: string
          city: string
          from_date: string
          home: string
          instagram: string
          note: string
          post_kind: string
          ra: string
          ref: string
          spotify: string
          src: string
          state: string
          ticket_url: string
          title: string
          to_date: string
          url: string
          venue: string
        }[]
      }
      update_my_artist: {
        Args: {
          p_bio: string
          p_city: string
          p_genres: string
          p_instagram: string
          p_mix_url: string
          p_photo_url: string
          p_soundcloud: string
          p_website: string
        }
        Returns: Json
      }
      vouchable_events: {
        Args: never
        Returns: {
          city: string
          event_date: string
          id: string
          lineup: string[]
          source: string
          title: string
          url: string
          venue: string
          vouched: boolean
          vouches: number
        }[]
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
