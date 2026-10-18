export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      academic_terms: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          school_id: string;
          starts_on: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          name: string;
          school_id: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name?: string;
          school_id?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_terms_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          assessed_on: string | null;
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          kind: Database["public"]["Enums"]["assessment_kind"];
          max_score: number;
          published_at: string | null;
          school_id: string;
          term_id: string | null;
          title: string;
          updated_at: string;
          weight: number | null;
        };
        ComputedFields: never;
        Insert: {
          assessed_on?: string | null;
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["assessment_kind"];
          max_score?: number;
          published_at?: string | null;
          school_id: string;
          term_id?: string | null;
          title: string;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          assessed_on?: string | null;
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["assessment_kind"];
          max_score?: number;
          published_at?: string | null;
          school_id?: string;
          term_id?: string | null;
          title?: string;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_school_id_course_id_fkey";
            columns: ["school_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "assessments_school_id_term_id_fkey";
            columns: ["school_id", "term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      attendance_records: {
        Row: {
          attended_on: string;
          course_id: string | null;
          created_at: string;
          id: string;
          minutes_late: number | null;
          note: string | null;
          period: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attended_on: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          minutes_late?: number | null;
          note?: string | null;
          period?: string | null;
          school_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          attended_on?: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          minutes_late?: number | null;
          note?: string | null;
          period?: string | null;
          school_id?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_school_id_course_id_fkey";
            columns: ["school_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "attendance_records_school_id_student_id_fkey";
            columns: ["school_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          id: number;
          new_data: Json | null;
          occurred_at: string;
          old_data: Json | null;
          record_id: string | null;
          school_id: string | null;
          table_name: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          record_id?: string | null;
          school_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          record_id?: string | null;
          school_id?: string | null;
          table_name?: string;
        };
        Relationships: [];
      };
      course_teachers: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          school_id: string;
          teacher_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          school_id: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          school_id?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_teachers_school_id_course_id_fkey";
            columns: ["school_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "course_teachers_school_id_teacher_id_fkey";
            columns: ["school_id", "teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      courses: {
        Row: {
          code: string | null;
          color: string | null;
          created_at: string;
          custom_fields: NonNullable<Json>;
          description: string | null;
          grade_level: string | null;
          id: string;
          name: string;
          school_id: string;
          subject: string | null;
          term_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code?: string | null;
          color?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          description?: string | null;
          grade_level?: string | null;
          id?: string;
          name: string;
          school_id: string;
          subject?: string | null;
          term_id?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          color?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          description?: string | null;
          grade_level?: string | null;
          id?: string;
          name?: string;
          school_id?: string;
          subject?: string | null;
          term_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_school_id_term_id_fkey";
            columns: ["school_id", "term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      custom_field_definitions: {
        Row: {
          created_at: string;
          entity: Database["public"]["Enums"]["custom_field_entity"];
          field_type: Database["public"]["Enums"]["custom_field_type"];
          id: string;
          key: string;
          label: string;
          options: string[];
          school_id: string;
          sort_order: number;
          updated_at: string;
          visible_to_guardians: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          entity: Database["public"]["Enums"]["custom_field_entity"];
          field_type: Database["public"]["Enums"]["custom_field_type"];
          id?: string;
          key: string;
          label: string;
          options?: string[];
          school_id: string;
          sort_order?: number;
          updated_at?: string;
          visible_to_guardians?: boolean;
        };
        Update: {
          created_at?: string;
          entity?: Database["public"]["Enums"]["custom_field_entity"];
          field_type?: Database["public"]["Enums"]["custom_field_type"];
          id?: string;
          key?: string;
          label?: string;
          options?: string[];
          school_id?: string;
          sort_order?: number;
          updated_at?: string;
          visible_to_guardians?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          course_id: string;
          created_at: string;
          enrolled_on: string | null;
          id: string;
          school_id: string;
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          course_id: string;
          created_at?: string;
          enrolled_on?: string | null;
          id?: string;
          school_id: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          enrolled_on?: string | null;
          id?: string;
          school_id?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_school_id_course_id_fkey";
            columns: ["school_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "enrollments_school_id_student_id_fkey";
            columns: ["school_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      events: {
        Row: {
          all_day: boolean;
          color: string | null;
          course_id: string | null;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          id: string;
          location: string | null;
          school_id: string;
          starts_at: string;
          title: string;
          updated_at: string;
          visible_to_guardians: boolean;
        };
        ComputedFields: never;
        Insert: {
          all_day?: boolean;
          color?: string | null;
          course_id?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          school_id: string;
          starts_at: string;
          title: string;
          updated_at?: string;
          visible_to_guardians?: boolean;
        };
        Update: {
          all_day?: boolean;
          color?: string | null;
          course_id?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          school_id?: string;
          starts_at?: string;
          title?: string;
          updated_at?: string;
          visible_to_guardians?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "events_school_id_course_id_fkey";
            columns: ["school_id", "course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "events_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      grades: {
        Row: {
          assessment_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          letter: string | null;
          school_id: string;
          score: number | null;
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assessment_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          letter?: string | null;
          school_id: string;
          score?: number | null;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          letter?: string | null;
          school_id?: string;
          score?: number | null;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grades_school_id_assessment_id_fkey";
            columns: ["school_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "grades_school_id_student_id_fkey";
            columns: ["school_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      guardian_invite_attempts: {
        Row: {
          attempted_at: string;
          id: number;
          succeeded: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempted_at?: string;
          id?: never;
          succeeded: boolean;
          user_id: string;
        };
        Update: {
          attempted_at?: string;
          id?: never;
          succeeded?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      guardian_invites: {
        Row: {
          code_hash: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          guardian_id: string;
          id: string;
          redeemed_at: string | null;
          redeemed_by: string | null;
          revoked_at: string | null;
          school_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          guardian_id: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          revoked_at?: string | null;
          school_id: string;
          updated_at?: string;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          guardian_id?: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          revoked_at?: string | null;
          school_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardian_invites_school_id_guardian_id_fkey";
            columns: ["school_id", "guardian_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      guardians: {
        Row: {
          address: string | null;
          created_at: string;
          custom_fields: NonNullable<Json>;
          email: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          link_method:
            Database["public"]["Enums"]["guardian_link_method"] | null;
          linked_at: string | null;
          phone: string | null;
          school_id: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          link_method?:
            Database["public"]["Enums"]["guardian_link_method"] | null;
          linked_at?: string | null;
          phone?: string | null;
          school_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          link_method?:
            Database["public"]["Enums"]["guardian_link_method"] | null;
          linked_at?: string | null;
          phone?: string | null;
          school_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guardians_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          locale: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          last_seen_at: string;
          locale: string | null;
          platform: Database["public"]["Enums"]["device_platform"];
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          locale?: string | null;
          platform: Database["public"]["Enums"]["device_platform"];
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          locale?: string | null;
          platform?: Database["public"]["Enums"]["device_platform"];
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      school_members: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["school_role"];
          school_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["school_role"];
          school_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["school_role"];
          school_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          default_locale: string;
          enabled_modules: Database["public"]["Enums"]["school_module"][];
          id: string;
          logo_path: string | null;
          name: string;
          primary_color: string | null;
          settings: NonNullable<Json>;
          slug: string;
          status: Database["public"]["Enums"]["school_status"];
          timezone: string;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          default_locale?: string;
          enabled_modules?: Database["public"]["Enums"]["school_module"][];
          id?: string;
          logo_path?: string | null;
          name: string;
          primary_color?: string | null;
          settings?: NonNullable<Json>;
          slug: string;
          status?: Database["public"]["Enums"]["school_status"];
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          default_locale?: string;
          enabled_modules?: Database["public"]["Enums"]["school_module"][];
          id?: string;
          logo_path?: string | null;
          name?: string;
          primary_color?: string | null;
          settings?: NonNullable<Json>;
          slug?: string;
          status?: Database["public"]["Enums"]["school_status"];
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      student_guardians: {
        Row: {
          created_at: string;
          guardian_id: string;
          id: string;
          is_primary: boolean;
          relationship:
            Database["public"]["Enums"]["guardian_relationship"] | null;
          school_id: string;
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          guardian_id: string;
          id?: string;
          is_primary?: boolean;
          relationship?:
            Database["public"]["Enums"]["guardian_relationship"] | null;
          school_id: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          guardian_id?: string;
          id?: string;
          is_primary?: boolean;
          relationship?:
            Database["public"]["Enums"]["guardian_relationship"] | null;
          school_id?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_guardians_school_id_guardian_id_fkey";
            columns: ["school_id", "guardian_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "student_guardians_school_id_student_id_fkey";
            columns: ["school_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      student_notes: {
        Row: {
          author_id: string | null;
          body: string;
          category: string | null;
          created_at: string;
          id: string;
          school_id: string;
          student_id: string;
          teacher_id: string | null;
          title: string | null;
          updated_at: string;
          visible_to_guardians: boolean;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          category?: string | null;
          created_at?: string;
          id?: string;
          school_id: string;
          student_id: string;
          teacher_id?: string | null;
          title?: string | null;
          updated_at?: string;
          visible_to_guardians?: boolean;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          category?: string | null;
          created_at?: string;
          id?: string;
          school_id?: string;
          student_id?: string;
          teacher_id?: string | null;
          title?: string | null;
          updated_at?: string;
          visible_to_guardians?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "student_notes_school_id_student_id_fkey";
            columns: ["school_id", "student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["school_id", "id"];
          },
          {
            foreignKeyName: "student_notes_school_id_teacher_id_fkey";
            columns: ["school_id", "teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["school_id", "id"];
          },
        ];
      };
      students: {
        Row: {
          address: string | null;
          created_at: string;
          custom_fields: NonNullable<Json>;
          date_of_birth: string | null;
          email: string | null;
          enrolled_on: string | null;
          first_name: string | null;
          gender: Database["public"]["Enums"]["gender"] | null;
          grade_level: string | null;
          id: string;
          last_name: string | null;
          notes: string | null;
          phone: string | null;
          photo_path: string | null;
          preferred_name: string | null;
          school_id: string;
          section: string | null;
          status: Database["public"]["Enums"]["student_status"];
          student_number: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          date_of_birth?: string | null;
          email?: string | null;
          enrolled_on?: string | null;
          first_name?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          grade_level?: string | null;
          id?: string;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          photo_path?: string | null;
          preferred_name?: string | null;
          school_id: string;
          section?: string | null;
          status?: Database["public"]["Enums"]["student_status"];
          student_number?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          date_of_birth?: string | null;
          email?: string | null;
          enrolled_on?: string | null;
          first_name?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          grade_level?: string | null;
          id?: string;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          photo_path?: string | null;
          preferred_name?: string | null;
          school_id?: string;
          section?: string | null;
          status?: Database["public"]["Enums"]["student_status"];
          student_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      teachers: {
        Row: {
          bio: string | null;
          created_at: string;
          custom_fields: NonNullable<Json>;
          date_of_birth: string | null;
          email: string | null;
          first_name: string | null;
          gender: Database["public"]["Enums"]["gender"] | null;
          id: string;
          last_name: string | null;
          phone: string | null;
          photo_path: string | null;
          school_id: string;
          staff_number: string | null;
          subject: string | null;
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          photo_path?: string | null;
          school_id: string;
          staff_number?: string | null;
          subject?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          custom_fields?: NonNullable<Json>;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          photo_path?: string | null;
          school_id?: string;
          staff_number?: string | null;
          subject?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_find_user_by_email: {
        Args: { p_email: string };
        Returns: {
          email_confirmed: boolean;
          user_id: string;
        }[];
      };
      create_guardian_invite: {
        Args: { p_guardian_id: string; p_valid_days?: number };
        Returns: {
          code: string;
          expires_at: string;
          invite_id: string;
        }[];
      };
      enroll_student_group: {
        Args: {
          p_course_id: string;
          p_grade_level: string;
          p_section?: string;
        };
        Returns: number;
      };
      guardian_children: {
        Args: Record<PropertyKey, never>;
        Returns: {
          enabled_modules: Database["public"]["Enums"]["school_module"][];
          first_name: string;
          grade_level: string;
          last_name: string;
          photo_path: string;
          preferred_name: string;
          relationship: Database["public"]["Enums"]["guardian_relationship"];
          school_id: string;
          school_logo_path: string;
          school_name: string;
          school_primary_color: string;
          school_timezone: string;
          section: string;
          status: Database["public"]["Enums"]["student_status"];
          student_id: string;
        }[];
      };
      guardian_student_attendance: {
        Args: { p_from: string; p_student_id: string; p_to: string };
        Returns: {
          attended_on: string;
          course_id: string;
          course_name: string;
          minutes_late: number;
          note: string;
          period: string;
          record_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
        }[];
      };
      guardian_student_attendance_summary: {
        Args: { p_from: string; p_student_id: string; p_to: string };
        Returns: {
          status: Database["public"]["Enums"]["attendance_status"];
          total: number;
        }[];
      };
      guardian_student_courses: {
        Args: { p_student_id: string };
        Returns: {
          code: string;
          color: string;
          course_id: string;
          name: string;
          subject: string;
          teachers: Json;
          term_id: string;
          term_name: string;
        }[];
      };
      guardian_student_events: {
        Args: { p_from: string; p_student_id: string; p_to: string };
        Returns: {
          all_day: boolean;
          color: string;
          course_id: string;
          course_name: string;
          description: string;
          ends_at: string;
          event_id: string;
          location: string;
          starts_at: string;
          title: string;
        }[];
      };
      guardian_student_grades: {
        Args: { p_student_id: string; p_term_id?: string };
        Returns: {
          assessed_on: string;
          assessment_id: string;
          assessment_kind: Database["public"]["Enums"]["assessment_kind"];
          assessment_title: string;
          comment: string;
          course_id: string;
          course_name: string;
          grade_id: string;
          letter: string;
          max_score: number;
          published_at: string;
          score: number;
          term_id: string;
          weight: number;
        }[];
      };
      guardian_student_notes: {
        Args: { p_before?: string; p_limit?: number; p_student_id: string };
        Returns: {
          body: string;
          category: string;
          created_at: string;
          note_id: string;
          teacher_name: string;
          title: string;
        }[];
      };
      guardian_student_notes_page: {
        Args: {
          p_before?: string;
          p_before_id?: string;
          p_limit?: number;
          p_student_id: string;
        };
        Returns: {
          body: string;
          category: string;
          created_at: string;
          note_id: string;
          teacher_name: string;
          title: string;
        }[];
      };
      guardian_student_profile: {
        Args: { p_student_id: string };
        Returns: {
          custom_fields: Json;
          date_of_birth: string;
          enrolled_on: string;
          first_name: string;
          gender: Database["public"]["Enums"]["gender"];
          grade_level: string;
          last_name: string;
          photo_path: string;
          preferred_name: string;
          school_id: string;
          section: string;
          status: Database["public"]["Enums"]["student_status"];
          student_id: string;
          student_number: string;
        }[];
      };
      import_students: {
        Args: { p_rows: Json; p_school_id: string };
        Returns: Json;
      };
      import_teachers: {
        Args: { p_rows: Json; p_school_id: string };
        Returns: Json;
      };
      is_platform_admin_account: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      link_my_guardian_records: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      my_account_context: { Args: Record<PropertyKey, never>; Returns: Json };
      platform_school_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          guardians_linked_count: number;
          name: string;
          school_id: string;
          slug: string;
          staff_count: number;
          status: Database["public"]["Enums"]["school_status"];
          students_count: number;
        }[];
      };
      redeem_guardian_invite: {
        Args: { p_code: string };
        Returns: {
          school_id: string;
          school_name: string;
          status: string;
        }[];
      };
      register_push_token: {
        Args: {
          p_locale?: unknown;
          p_platform: Database["public"]["Enums"]["device_platform"];
          p_token: string;
        };
        Returns: undefined;
      };
      save_attendance: {
        Args: {
          p_course_id?: string;
          p_date: string;
          p_entries: Json;
          p_period?: string;
          p_school_id: string;
        };
        Returns: number;
      };
      save_grades: {
        Args: { p_assessment_id: string; p_entries: Json };
        Returns: number;
      };
      school_dashboard_stats: {
        Args: { p_school_id: string };
        Returns: {
          attendance_today: Json;
          courses_total: number;
          guardians_linked: number;
          guardians_total: number;
          students_active: number;
          students_total: number;
          teachers_total: number;
          upcoming_events: number;
        }[];
      };
      school_member_accounts: {
        Args: { p_school_id: string };
        Returns: {
          id: string;
          user_id: string;
          role: Database["public"]["Enums"]["school_role"];
          email: string;
          full_name: string;
          pending: boolean;
          last_sign_in_at: string;
        }[];
      };
      school_student_groups: {
        Args: { p_school_id: string };
        Returns: {
          grade_level: string;
          section: string;
          student_count: number;
        }[];
      };
    };
    Enums: {
      assessment_kind:
        | "exam"
        | "quiz"
        | "homework"
        | "project"
        | "participation"
        | "term_grade"
        | "other";
      attendance_status: "present" | "absent" | "late" | "excused";
      custom_field_entity: "student" | "teacher" | "guardian" | "course";
      custom_field_type:
        | "text"
        | "long_text"
        | "number"
        | "boolean"
        | "date"
        | "select"
        | "multi_select"
        | "email"
        | "phone"
        | "url";
      device_platform: "ios" | "android" | "web";
      gender: "female" | "male" | "other" | "undisclosed";
      guardian_link_method: "email" | "invite";
      guardian_relationship:
        "mother" | "father" | "guardian" | "grandparent" | "sibling" | "other";
      school_module:
        "teachers" | "courses" | "grades" | "attendance" | "notes" | "events";
      school_role: "admin" | "staff";
      school_status: "active" | "suspended";
      student_status: "active" | "inactive" | "graduated" | "transferred";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      assessment_kind: [
        "exam",
        "quiz",
        "homework",
        "project",
        "participation",
        "term_grade",
        "other",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      custom_field_entity: ["student", "teacher", "guardian", "course"],
      custom_field_type: [
        "text",
        "long_text",
        "number",
        "boolean",
        "date",
        "select",
        "multi_select",
        "email",
        "phone",
        "url",
      ],
      device_platform: ["ios", "android", "web"],
      gender: ["female", "male", "other", "undisclosed"],
      guardian_link_method: ["email", "invite"],
      guardian_relationship: [
        "mother",
        "father",
        "guardian",
        "grandparent",
        "sibling",
        "other",
      ],
      school_module: [
        "teachers",
        "courses",
        "grades",
        "attendance",
        "notes",
        "events",
      ],
      school_role: ["admin", "staff"],
      school_status: ["active", "suspended"],
      student_status: ["active", "inactive", "graduated", "transferred"],
    },
  },
} as const;
