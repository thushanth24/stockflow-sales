import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateTypes() {
  try {
    const { data, error } = await supabase.rpc('get_type_definition', {
      schema_name: 'public',
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from Supabase');
    }

    const typeDefinition = `// This file is auto-generated. Do not edit manually.
// To regenerate, run: npx tsx scripts/generate-types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

${data}
`;

    const outputPath = join(process.cwd(), 'src', 'integrations', 'supabase', 'types.ts');
    writeFileSync(outputPath, typeDefinition);
    console.log('✅ Types generated successfully!');
  } catch (error) {
    console.error('❌ Error generating types:');
    console.error(error);
    process.exit(1);
  }
}

generateTypes();
