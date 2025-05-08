// Database type definition
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          title: string;
          description?: string;
          price: number;
          seller_id: string;
          main_image_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          amount: number;
          status: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at?: string;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type Offer = Database['public']['Tables']['offers']['Row'];
export type Chat = Database['public']['Tables']['chats']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
