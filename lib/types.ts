export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    username: string | null
                    role: 'reader' | 'author' | 'admin'
                    avatar_url: string | null
                    bio: string | null
                    website: string | null
                    is_verified: boolean
                    coins: number
                    interests: string[] | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    username?: string | null
                    role?: 'reader' | 'author' | 'admin'
                    // ... add other optional fields
                }
                Update: {
                    full_name?: string | null
                    // ... add other optional fields
                }
            }
            books: {
                Row: {
                    id: string
                    title: string
                    author_id: string
                    cover_url: string | null
                    description: string | null
                    genre: string
                    status: 'pending_review' | 'approved' | 'rejected' | 'draft'
                    price: number
                    views_count: number
                    rating: number
                    created_at: string
                }
                Insert: {
                    // ... fields needed for insert
                }
                Update: {
                    // ... fields needed for update
                }
            }
            chapters: {
                Row: {
                    id: string
                    book_id: string
                    title: string
                    content: string
                    sequence_number: number
                    is_locked: boolean
                    created_at: string
                }
                Insert: {
                    // ...
                }
                Update: {
                    // ...
                }
            }
        }
    }
}

// --- HELPER TYPES (Ito yung idinagdag mo kanina) ---

// Kinukuha nito ang Row type mula sa Database definition sa taas
export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"];

// Specific Types Shortcuts
export type Profile = Tables<"profiles">;
export type Book = Tables<"books">;
export type Chapter = Tables<"chapters">;