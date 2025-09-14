import { Database as GeneratedDatabase } from '@/generated/supabase';

export interface Tables extends GeneratedDatabase['public']['Tables'] {
  returns: {
    Row: {
      id: string;
      product_id: string;
      quantity: number;
      reason: string;
      return_date: string;
      created_by: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      product_id: string;
      quantity: number;
      reason: string;
      return_date?: string;
      created_by: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      product_id?: string;
      quantity?: number;
      reason?: string;
      return_date?: string;
      created_by?: string;
      created_at?: string;
    };
  };
}

export interface Database extends Omit<GeneratedDatabase, 'public'> {
  public: {
    Tables: Tables;
    Functions: GeneratedDatabase['public']['Functions'] & {
      handle_return: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_reason: string;
          p_created_by: string;
        };
        Returns: {
          success: boolean;
          data?: any;
          error?: string;
        };
      };
    };
  };
}
