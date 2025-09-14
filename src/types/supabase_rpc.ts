import { SupabaseClient, PostgrestResponse } from '@supabase/supabase-js';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = any>(
      fn: 'insert_sales_records',
      params: {
        p_sales_data: Array<{
          product_id: string;
          quantity: number;
          revenue: number;
          sale_date: string;
        }>;
      }
    ): Promise<PostgrestResponse<T>>;
    
    rpc<T = any>(
      fn: 'handle_damage_report',
      params: {
        damage_data: Array<{
          product_id: string;
          quantity: number;
          reason: string;
          damage_date?: string;
          created_by?: string;
        }>;
      }
    ): Promise<PostgrestResponse<T>>;
  }
}
