// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE -- DO NOT EDIT BY HAND.
//
// Regenerate with the Supabase MCP `generate_typescript_types`, or:
//   npx supabase gen types typescript --linked > src/frontend/types/database.ts
//
// This is the schema's own account of itself, across all 68 migrations. The
// hand-written interfaces in features/*/types/*.ts predate it and are NOT
// checked against it -- which is the real type risk in this codebase, not
// missing annotations (type coverage is already 99.7%).
//
// Typing the supabase client with `createClient<Database>` makes schema drift
// a compile error. That migration is deliberately NOT done in the same commit
// that introduces this file, so the diff stays reviewable.
// ─────────────────────────────────────────────────────────────────────────────

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
      ability_scores: {
        Row: {
          background_bonus_primary: string | null
          background_bonus_secondary: string | null
          character_id: string
          charisma: number
          constitution: number
          dexterity: number
          id: string
          intelligence: number
          method: string
          strength: number
          wisdom: number
        }
        Insert: {
          background_bonus_primary?: string | null
          background_bonus_secondary?: string | null
          character_id: string
          charisma?: number
          constitution?: number
          dexterity?: number
          id?: string
          intelligence?: number
          method?: string
          strength?: number
          wisdom?: number
        }
        Update: {
          background_bonus_primary?: string | null
          background_bonus_secondary?: string | null
          character_id?: string
          charisma?: number
          constitution?: number
          dexterity?: number
          id?: string
          intelligence?: number
          method?: string
          strength?: number
          wisdom?: number
        }
        Relationships: [
          {
            foreignKeyName: "ability_scores_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_emails: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          email: string
          id: string
          invited_by: string | null
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
        }
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      campaign_items: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          item_name: string
          weight: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_name: string
          weight?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_name?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string
          current_session: number
          description: string | null
          id: string
          name: string
          session_label: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_session?: number
          description?: string | null
          id?: string
          name: string
          session_label?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_session?: number
          description?: string | null
          id?: string
          name?: string
          session_label?: string
        }
        Relationships: []
      }
      character_attacks: {
        Row: {
          attack_modifier: number
          character_id: string
          created_at: string
          damage_modifier: number
          damage_type: string
          dice_count: number
          dice_sides: number
          id: string
          is_finesse: boolean
          is_light: boolean
          is_ranged: boolean
          is_spell: boolean
          is_thrown: boolean
          mastery: string | null
          name: string
          notes: string | null
          versatile_sides: number | null
        }
        Insert: {
          attack_modifier?: number
          character_id: string
          created_at?: string
          damage_modifier?: number
          damage_type?: string
          dice_count?: number
          dice_sides?: number
          id?: string
          is_finesse?: boolean
          is_light?: boolean
          is_ranged?: boolean
          is_spell?: boolean
          is_thrown?: boolean
          mastery?: string | null
          name: string
          notes?: string | null
          versatile_sides?: number | null
        }
        Update: {
          attack_modifier?: number
          character_id?: string
          created_at?: string
          damage_modifier?: number
          damage_type?: string
          dice_count?: number
          dice_sides?: number
          id?: string
          is_finesse?: boolean
          is_light?: boolean
          is_ranged?: boolean
          is_spell?: boolean
          is_thrown?: boolean
          mastery?: string | null
          name?: string
          notes?: string | null
          versatile_sides?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_attacks_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_audit_log: {
        Row: {
          changed_at: string
          changed_by: string
          character_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          character_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          character_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_audit_log_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_campaign_stats: {
        Row: {
          campaign_id: string
          character_id: string
          id: string
          stats: Json
          updated_at: string
        }
        Insert: {
          campaign_id: string
          character_id: string
          id?: string
          stats?: Json
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          character_id?: string
          id?: string
          stats?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_campaign_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_campaign_stats_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_features: {
        Row: {
          character_id: string
          choice: string | null
          created_at: string
          description: string | null
          id: string
          level_gained: number
          name: string
          sort_order: number
          source: string
        }
        Insert: {
          character_id: string
          choice?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level_gained?: number
          name: string
          sort_order?: number
          source?: string
        }
        Update: {
          character_id?: string
          choice?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level_gained?: number
          name?: string
          sort_order?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_features_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_inventory: {
        Row: {
          character_id: string
          created_at: string
          description: string | null
          id: string
          is_attuned: boolean
          is_equipped: boolean
          item_name: string
          quantity: number
          requires_attunement: boolean
          weight: number | null
        }
        Insert: {
          character_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_attuned?: boolean
          is_equipped?: boolean
          item_name: string
          quantity?: number
          requires_attunement?: boolean
          weight?: number | null
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_attuned?: boolean
          is_equipped?: boolean
          item_name?: string
          quantity?: number
          requires_attunement?: boolean
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_inventory_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_proficiencies: {
        Row: {
          character_id: string
          id: string
          is_expertise: boolean
          skill: string
          source: string
        }
        Insert: {
          character_id: string
          id?: string
          is_expertise?: boolean
          skill: string
          source?: string
        }
        Update: {
          character_id?: string
          id?: string
          is_expertise?: boolean
          skill?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_proficiencies_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_resources: {
        Row: {
          character_id: string
          created_at: string
          current: number
          id: string
          max: number
          name: string
          recharge: string
          sort_order: number
        }
        Insert: {
          character_id: string
          created_at?: string
          current?: number
          id?: string
          max?: number
          name: string
          recharge?: string
          sort_order?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          current?: number
          id?: string
          max?: number
          name?: string
          recharge?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_resources_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_spell_slots: {
        Row: {
          character_id: string
          id: string
          slots_expended: number
          slots_total: number
          spell_level: number
        }
        Insert: {
          character_id: string
          id?: string
          slots_expended?: number
          slots_total?: number
          spell_level: number
        }
        Update: {
          character_id?: string
          id?: string
          slots_expended?: number
          slots_total?: number
          spell_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_spell_slots_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_spells: {
        Row: {
          attack_type: string | null
          casting_time: string | null
          character_id: string
          components: string[] | null
          concentration: boolean
          created_at: string
          damage_dice: string | null
          damage_type: string | null
          description: string | null
          id: string
          is_prepared: boolean
          is_ritual: boolean
          level: number
          name: string
          range_text: string | null
          school: string | null
        }
        Insert: {
          attack_type?: string | null
          casting_time?: string | null
          character_id: string
          components?: string[] | null
          concentration?: boolean
          created_at?: string
          damage_dice?: string | null
          damage_type?: string | null
          description?: string | null
          id?: string
          is_prepared?: boolean
          is_ritual?: boolean
          level?: number
          name: string
          range_text?: string | null
          school?: string | null
        }
        Update: {
          attack_type?: string | null
          casting_time?: string | null
          character_id?: string
          components?: string[] | null
          concentration?: boolean
          created_at?: string
          damage_dice?: string | null
          damage_type?: string | null
          description?: string | null
          id?: string
          is_prepared?: boolean
          is_ritual?: boolean
          level?: number
          name?: string
          range_text?: string | null
          school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_spells_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          ac: number | null
          alignment: string | null
          armor_proficiencies: string[]
          background: string
          backstory: string | null
          blindsight: number | null
          bonds: string | null
          burrow_speed: number | null
          campaign_id: string
          class: string
          climb_speed: number | null
          concentrating_on: string | null
          condition_immunities: string[]
          conditions: string[]
          created_at: string
          currency_dollars: number
          damage_immunities: string[]
          damage_resistances: string[]
          damage_vulnerabilities: string[]
          darkvision: number | null
          death_save_failures: number
          death_save_successes: number
          editing_by: string | null
          editing_since: string | null
          exhaustion: number
          features_notes: string | null
          flaws: string | null
          fly_speed: number | null
          heroic_inspiration: boolean
          hit_dice_current: number | null
          hp_current: number | null
          hp_max: number | null
          hp_temp: number
          id: string
          ideals: string | null
          is_locked: boolean
          languages_known: string[]
          level: number
          level_up_pending: boolean
          name: string
          owner_id: string
          personality_traits: string | null
          portrait_url: string | null
          saving_throw_proficiencies: string[]
          size: string
          species: string
          speed: number
          spellcasting_ability: string | null
          status: string
          subclass: string | null
          swim_speed: number | null
          tool_proficiencies: string[]
          tremorsense: number | null
          truesight: number | null
          updated_at: string
          weapon_proficiencies: string[]
          will_of_void: number
          will_of_void_notes: string | null
        }
        Insert: {
          ac?: number | null
          alignment?: string | null
          armor_proficiencies?: string[]
          background: string
          backstory?: string | null
          blindsight?: number | null
          bonds?: string | null
          burrow_speed?: number | null
          campaign_id: string
          class: string
          climb_speed?: number | null
          concentrating_on?: string | null
          condition_immunities?: string[]
          conditions?: string[]
          created_at?: string
          currency_dollars?: number
          damage_immunities?: string[]
          damage_resistances?: string[]
          damage_vulnerabilities?: string[]
          darkvision?: number | null
          death_save_failures?: number
          death_save_successes?: number
          editing_by?: string | null
          editing_since?: string | null
          exhaustion?: number
          features_notes?: string | null
          flaws?: string | null
          fly_speed?: number | null
          heroic_inspiration?: boolean
          hit_dice_current?: number | null
          hp_current?: number | null
          hp_max?: number | null
          hp_temp?: number
          id?: string
          ideals?: string | null
          is_locked?: boolean
          languages_known?: string[]
          level?: number
          level_up_pending?: boolean
          name: string
          owner_id: string
          personality_traits?: string | null
          portrait_url?: string | null
          saving_throw_proficiencies?: string[]
          size?: string
          species: string
          speed?: number
          spellcasting_ability?: string | null
          status?: string
          subclass?: string | null
          swim_speed?: number | null
          tool_proficiencies?: string[]
          tremorsense?: number | null
          truesight?: number | null
          updated_at?: string
          weapon_proficiencies?: string[]
          will_of_void?: number
          will_of_void_notes?: string | null
        }
        Update: {
          ac?: number | null
          alignment?: string | null
          armor_proficiencies?: string[]
          background?: string
          backstory?: string | null
          blindsight?: number | null
          bonds?: string | null
          burrow_speed?: number | null
          campaign_id?: string
          class?: string
          climb_speed?: number | null
          concentrating_on?: string | null
          condition_immunities?: string[]
          conditions?: string[]
          created_at?: string
          currency_dollars?: number
          damage_immunities?: string[]
          damage_resistances?: string[]
          damage_vulnerabilities?: string[]
          darkvision?: number | null
          death_save_failures?: number
          death_save_successes?: number
          editing_by?: string | null
          editing_since?: string | null
          exhaustion?: number
          features_notes?: string | null
          flaws?: string | null
          fly_speed?: number | null
          heroic_inspiration?: boolean
          hit_dice_current?: number | null
          hp_current?: number | null
          hp_max?: number | null
          hp_temp?: number
          id?: string
          ideals?: string | null
          is_locked?: boolean
          languages_known?: string[]
          level?: number
          level_up_pending?: boolean
          name?: string
          owner_id?: string
          personality_traits?: string | null
          portrait_url?: string | null
          saving_throw_proficiencies?: string[]
          size?: string
          species?: string
          speed?: number
          spellcasting_ability?: string | null
          status?: string
          subclass?: string | null
          swim_speed?: number | null
          tool_proficiencies?: string[]
          tremorsense?: number | null
          truesight?: number | null
          updated_at?: string
          weapon_proficiencies?: string[]
          will_of_void?: number
          will_of_void_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_monsters: {
        Row: {
          ac: number
          actions: Json
          alignment: string | null
          campaign_id: string
          cha_score: number
          con_score: number
          condition_immunities: string[]
          cr: string
          created_at: string
          created_by: string | null
          damage_immunities: string[]
          damage_resistances: string[]
          default_initiative: number
          description: string | null
          dex_score: number
          hp: number
          id: string
          int_score: number
          languages: string | null
          legendary_actions: Json
          name: string
          portrait_url: string | null
          senses: string | null
          size: string
          special_abilities: Json
          speed: number
          str_score: number
          type: string
          wis_score: number
          xp: number
        }
        Insert: {
          ac?: number
          actions?: Json
          alignment?: string | null
          campaign_id: string
          cha_score?: number
          con_score?: number
          condition_immunities?: string[]
          cr?: string
          created_at?: string
          created_by?: string | null
          damage_immunities?: string[]
          damage_resistances?: string[]
          default_initiative?: number
          description?: string | null
          dex_score?: number
          hp?: number
          id?: string
          int_score?: number
          languages?: string | null
          legendary_actions?: Json
          name: string
          portrait_url?: string | null
          senses?: string | null
          size?: string
          special_abilities?: Json
          speed?: number
          str_score?: number
          type?: string
          wis_score?: number
          xp?: number
        }
        Update: {
          ac?: number
          actions?: Json
          alignment?: string | null
          campaign_id?: string
          cha_score?: number
          con_score?: number
          condition_immunities?: string[]
          cr?: string
          created_at?: string
          created_by?: string | null
          damage_immunities?: string[]
          damage_resistances?: string[]
          default_initiative?: number
          description?: string | null
          dex_score?: number
          hp?: number
          id?: string
          int_score?: number
          languages?: string | null
          legendary_actions?: Json
          name?: string
          portrait_url?: string | null
          senses?: string | null
          size?: string
          special_abilities?: Json
          speed?: number
          str_score?: number
          type?: string
          wis_score?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_monsters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      dice_rolls: {
        Row: {
          campaign_id: string
          character_id: string | null
          character_name: string | null
          dice_type: string
          encounter_id: string | null
          id: string
          modifier: number
          result: number
          roll_type: string
          rolled_at: string
          rolled_by_dm: boolean
          total: number
          user_id: string
        }
        Insert: {
          campaign_id: string
          character_id?: string | null
          character_name?: string | null
          dice_type: string
          encounter_id?: string | null
          id?: string
          modifier?: number
          result: number
          roll_type: string
          rolled_at?: string
          rolled_by_dm?: boolean
          total: number
          user_id: string
        }
        Update: {
          campaign_id?: string
          character_id?: string | null
          character_name?: string | null
          dice_type?: string
          encounter_id?: string | null
          id?: string
          modifier?: number
          result?: number
          roll_type?: string
          rolled_at?: string
          rolled_by_dm?: boolean
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dice_rolls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dice_rolls_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dice_rolls_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounter_effects: {
        Row: {
          created_at: string
          created_by: string | null
          created_round: number
          created_turn_seq: number
          description: string | null
          encounter_id: string
          expiry: string
          id: string
          name: string
          rounds_remaining: number | null
          source_participant_id: string | null
          target_participant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_round?: number
          created_turn_seq?: number
          description?: string | null
          encounter_id: string
          expiry: string
          id?: string
          name: string
          rounds_remaining?: number | null
          source_participant_id?: string | null
          target_participant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_round?: number
          created_turn_seq?: number
          description?: string | null
          encounter_id?: string
          expiry?: string
          id?: string
          name?: string
          rounds_remaining?: number | null
          source_participant_id?: string | null
          target_participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounter_effects_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounter_effects_source_fkey"
            columns: ["source_participant_id", "encounter_id"]
            isOneToOne: false
            referencedRelation: "encounter_participants"
            referencedColumns: ["id", "encounter_id"]
          },
          {
            foreignKeyName: "encounter_effects_target_fkey"
            columns: ["target_participant_id", "encounter_id"]
            isOneToOne: false
            referencedRelation: "encounter_participants"
            referencedColumns: ["id", "encounter_id"]
          },
        ]
      }
      encounter_events: {
        Row: {
          actor_id: string | null
          created_at: string
          encounter_id: string
          id: number
          kind: string
          participant_id: string | null
          payload: Json
          round: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          encounter_id: string
          id?: number
          kind: string
          participant_id?: string | null
          payload: Json
          round?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          encounter_id?: string
          id?: number
          kind?: string
          participant_id?: string | null
          payload?: Json
          round?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "encounter_events_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounter_participants: {
        Row: {
          ac: number
          action_used: boolean
          actions: Json | null
          bonus_used: boolean
          cha_score: number | null
          character_id: string | null
          con_score: number | null
          concentrating_on: string | null
          conditions: string[]
          cover: string
          damage_immunities: string[]
          damage_resistances: string[]
          damage_vulnerabilities: string[]
          death_save_failures: number
          death_save_successes: number
          description: string | null
          dex_score: number | null
          dodging: boolean
          encounter_id: string
          exhaustion: number
          has_rolled_initiative: boolean
          heroic_inspiration: boolean
          hp_current: number
          hp_max: number
          hp_temp: number
          id: string
          initiative_order: number
          initiative_score: number
          int_score: number | null
          is_player: boolean
          legendary_actions: Json | null
          legendary_actions_max: number
          legendary_actions_remaining: number
          name: string
          owner_id: string | null
          portrait_url: string | null
          reaction_used: boolean
          special_abilities: Json | null
          str_score: number | null
          wis_score: number | null
        }
        Insert: {
          ac?: number
          action_used?: boolean
          actions?: Json | null
          bonus_used?: boolean
          cha_score?: number | null
          character_id?: string | null
          con_score?: number | null
          concentrating_on?: string | null
          conditions?: string[]
          cover?: string
          damage_immunities?: string[]
          damage_resistances?: string[]
          damage_vulnerabilities?: string[]
          death_save_failures?: number
          death_save_successes?: number
          description?: string | null
          dex_score?: number | null
          dodging?: boolean
          encounter_id: string
          exhaustion?: number
          has_rolled_initiative?: boolean
          heroic_inspiration?: boolean
          hp_current?: number
          hp_max?: number
          hp_temp?: number
          id?: string
          initiative_order?: number
          initiative_score?: number
          int_score?: number | null
          is_player?: boolean
          legendary_actions?: Json | null
          legendary_actions_max?: number
          legendary_actions_remaining?: number
          name: string
          owner_id?: string | null
          portrait_url?: string | null
          reaction_used?: boolean
          special_abilities?: Json | null
          str_score?: number | null
          wis_score?: number | null
        }
        Update: {
          ac?: number
          action_used?: boolean
          actions?: Json | null
          bonus_used?: boolean
          cha_score?: number | null
          character_id?: string | null
          con_score?: number | null
          concentrating_on?: string | null
          conditions?: string[]
          cover?: string
          damage_immunities?: string[]
          damage_resistances?: string[]
          damage_vulnerabilities?: string[]
          death_save_failures?: number
          death_save_successes?: number
          description?: string | null
          dex_score?: number | null
          dodging?: boolean
          encounter_id?: string
          exhaustion?: number
          has_rolled_initiative?: boolean
          heroic_inspiration?: boolean
          hp_current?: number
          hp_max?: number
          hp_temp?: number
          id?: string
          initiative_order?: number
          initiative_score?: number
          int_score?: number | null
          is_player?: boolean
          legendary_actions?: Json | null
          legendary_actions_max?: number
          legendary_actions_remaining?: number
          name?: string
          owner_id?: string | null
          portrait_url?: string | null
          reaction_used?: boolean
          special_abilities?: Json | null
          str_score?: number | null
          wis_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "encounter_participants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounter_participants_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          current_participant_id: string | null
          ended_at: string | null
          id: string
          is_template: boolean
          lair_action_initiative: number | null
          name: string
          round: number
          started_at: string | null
          status: string
          turn_seq: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by: string
          current_participant_id?: string | null
          ended_at?: string | null
          id?: string
          is_template?: boolean
          lair_action_initiative?: number | null
          name?: string
          round?: number
          started_at?: string | null
          status?: string
          turn_seq?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          current_participant_id?: string | null
          ended_at?: string | null
          id?: string
          is_template?: boolean
          lair_action_initiative?: number | null
          name?: string
          round?: number
          started_at?: string | null
          status?: string
          turn_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "encounters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      party_stats: {
        Row: {
          campaign_id: string
          id: string
          stats: Json
          updated_at: string
          void_alignment: number
        }
        Insert: {
          campaign_id: string
          id?: string
          stats?: Json
          updated_at?: string
          void_alignment?: number
        }
        Update: {
          campaign_id?: string
          id?: string
          stats?: Json
          updated_at?: string
          void_alignment?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          campaign_id: string
          content: string | null
          created_at: string
          id: string
          session_number: number
          updated_at: string
          visibility: string
        }
        Insert: {
          campaign_id: string
          content?: string | null
          created_at?: string
          id?: string
          session_number: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          campaign_id?: string
          content?: string | null
          created_at?: string
          id?: string
          session_number?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      srd_armor: {
        Row: {
          add_dex: boolean
          base_ac: number
          category: string
          id: string
          max_dex: number | null
          name: string
          stealth_disadvantage: boolean
          strength_req: number
          weight: number
        }
        Insert: {
          add_dex?: boolean
          base_ac: number
          category: string
          id?: string
          max_dex?: number | null
          name: string
          stealth_disadvantage?: boolean
          strength_req?: number
          weight?: number
        }
        Update: {
          add_dex?: boolean
          base_ac?: number
          category?: string
          id?: string
          max_dex?: number | null
          name?: string
          stealth_disadvantage?: boolean
          strength_req?: number
          weight?: number
        }
        Relationships: []
      }
      srd_backgrounds: {
        Row: {
          ability_scores: string[]
          equipment_description: string | null
          feat: string | null
          index: string
          name: string
          skill_proficiencies: string[]
          tool_proficiency: string | null
        }
        Insert: {
          ability_scores?: string[]
          equipment_description?: string | null
          feat?: string | null
          index: string
          name: string
          skill_proficiencies?: string[]
          tool_proficiency?: string | null
        }
        Update: {
          ability_scores?: string[]
          equipment_description?: string | null
          feat?: string | null
          index?: string
          name?: string
          skill_proficiencies?: string[]
          tool_proficiency?: string | null
        }
        Relationships: []
      }
      srd_class_features: {
        Row: {
          class_name: string
          feature_name: string
          id: string
          level: number
        }
        Insert: {
          class_name: string
          feature_name: string
          id?: string
          level: number
        }
        Update: {
          class_name?: string
          feature_name?: string
          id?: string
          level?: number
        }
        Relationships: []
      }
      srd_classes: {
        Row: {
          armor_proficiencies: string | null
          hit_die: number
          index: string
          is_spellcaster: boolean
          name: string
          primary_ability: string
          saving_throws: string[]
          skill_choices: string[]
          skill_count: number
          spell_slots_by_level: Json | null
          spellcasting_ability: string | null
          starting_equipment: string | null
          subclasses: string[]
          weapon_proficiencies: string | null
        }
        Insert: {
          armor_proficiencies?: string | null
          hit_die?: number
          index: string
          is_spellcaster?: boolean
          name: string
          primary_ability?: string
          saving_throws?: string[]
          skill_choices?: string[]
          skill_count?: number
          spell_slots_by_level?: Json | null
          spellcasting_ability?: string | null
          starting_equipment?: string | null
          subclasses?: string[]
          weapon_proficiencies?: string | null
        }
        Update: {
          armor_proficiencies?: string | null
          hit_die?: number
          index?: string
          is_spellcaster?: boolean
          name?: string
          primary_ability?: string
          saving_throws?: string[]
          skill_choices?: string[]
          skill_count?: number
          spell_slots_by_level?: Json | null
          spellcasting_ability?: string | null
          starting_equipment?: string | null
          subclasses?: string[]
          weapon_proficiencies?: string | null
        }
        Relationships: []
      }
      srd_feats: {
        Row: {
          category: string | null
          description: string
          index: string
          name: string
          prerequisite: string | null
        }
        Insert: {
          category?: string | null
          description: string
          index: string
          name: string
          prerequisite?: string | null
        }
        Update: {
          category?: string | null
          description?: string
          index?: string
          name?: string
          prerequisite?: string | null
        }
        Relationships: []
      }
      srd_feature_details: {
        Row: {
          class_name: string
          description: string
          feature_name: string
          id: string
          level: number | null
        }
        Insert: {
          class_name: string
          description?: string
          feature_name: string
          id?: string
          level?: number | null
        }
        Update: {
          class_name?: string
          description?: string
          feature_name?: string
          id?: string
          level?: number | null
        }
        Relationships: []
      }
      srd_rules: {
        Row: {
          category: string
          content: string
          id: string
          slug: string | null
          title: string
        }
        Insert: {
          category: string
          content: string
          id?: string
          slug?: string | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          id?: string
          slug?: string | null
          title?: string
        }
        Relationships: []
      }
      srd_species: {
        Row: {
          darkvision: number
          id: string
          name: string
          size: string
          source: string
          speed: number
        }
        Insert: {
          darkvision?: number
          id?: string
          name: string
          size: string
          source?: string
          speed?: number
        }
        Update: {
          darkvision?: number
          id?: string
          name?: string
          size?: string
          source?: string
          speed?: number
        }
        Relationships: []
      }
      srd_spells: {
        Row: {
          attack_type: string | null
          casting_time: string | null
          classes: string[] | null
          components: string[] | null
          concentration: boolean
          damage_dice: string | null
          damage_type: string | null
          description: string | null
          duration: string | null
          index: string
          level: number
          name: string
          range_text: string | null
          ritual: boolean
          school: string | null
        }
        Insert: {
          attack_type?: string | null
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean
          damage_dice?: string | null
          damage_type?: string | null
          description?: string | null
          duration?: string | null
          index: string
          level: number
          name: string
          range_text?: string | null
          ritual?: boolean
          school?: string | null
        }
        Update: {
          attack_type?: string | null
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean
          damage_dice?: string | null
          damage_type?: string | null
          description?: string | null
          duration?: string | null
          index?: string
          level?: number
          name?: string
          range_text?: string | null
          ritual?: boolean
          school?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_encounter_turn: {
        Args: { p_encounter_id: string }
        Returns: undefined
      }
      find_user_id_by_email: { Args: { target_email: string }; Returns: string }
      get_campaign_current_session: {
        Args: { _campaign_id: string }
        Returns: number
      }
      get_campaign_members_with_email: {
        Args: { cid: string }
        Returns: {
          email: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_my_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_my_app_roles: { Args: never; Returns: string[] }
      is_app_admin: { Args: never; Returns: boolean }
      is_campaign_dm: { Args: { _campaign_id: string }; Returns: boolean }
      is_campaign_member: { Args: { _campaign_id: string }; Returns: boolean }
      is_email_allowed: { Args: { user_email: string }; Returns: boolean }
      level_up_campaign: { Args: { campaign_id: string }; Returns: undefined }
      reorder_initiative: {
        Args: { p_encounter_id: string }
        Returns: undefined
      }
      set_campaign_session: {
        Args: { p_campaign_id: string; p_session: number }
        Returns: undefined
      }
      tick_encounter_effects: {
        Args: {
          p_encounter_id: string
          p_next: string
          p_prev: string
          p_prev_seq: number
          p_wrapped: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "dm" | "player"
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
      app_role: ["admin", "dm", "player"],
    },
  },
} as const
