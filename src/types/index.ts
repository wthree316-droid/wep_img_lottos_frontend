/**
 * TypeScript Type Definitions
 */

export interface TemplateSlot {
  id: string;
  template_id: string;
  slot_type: 'system_label' | 'user_input' | 'auto_data';
  label_text: string;
  data_key: string | null;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  style_config: {
    color: string;
    fontSize: number;
    backgroundColor?: string;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    fontWeight: 'normal' | 'bold';
  };
  z_index: number;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  base_width: number;
  base_height: number;
  background_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template_slots?: TemplateSlot[];
}

export interface Lottery {
  id: string;
  name: string;
  template_id: string;
  is_active: boolean;
  created_at: string;
  templates?: {
    background_url: string;
    base_width: number;
    base_height: number;
  };
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'member';
  assigned_template_id?: string;
  created_at: string;
}

export interface GeneratePayload {
  template_id: string;
  user_seed?: string;
  slot_configs: Array<{
    id: string;
    slot_type: 'system_label' | 'user_input' | 'auto_data';
    data_key?: string;
  }>;
}

export interface GenerateResponse {
  results: Record<string, string>;
}
