export interface TemplateSlot {
  id: string;
  template_id: string;
  slot_type: 'system_label' | 'user_input' | 'auto_data' | 'qr_code' | 'static_text'; // ✅ เพิ่ม type
  label_text: string;
  data_key: string | null;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  style_config: {
    color: string;
    gradientColors?: string[];
    fontSize: number;
    backgroundColor?: string;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    fontWeight: 'normal' | 'bold';
    stroke?: string;
    textShadow?: string;
    strokeWidth?: number;
  };
  z_index: number;
  created_at: string;
}

export interface TemplateBackground { // ✅ เพิ่ม interface
    id: string;
    template_id: string;
    name: string;
    url: string;
    created_at: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'member';
  assigned_template_id?: string;
  allowed_template_ids?: string[];
  // ✅ เพิ่มฟิลด์ใหม่
  custom_line_id?: string;
  custom_qr_code_url?: string;
  is_suspended?: boolean;
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
  is_master?: boolean;
  // ✅ เพิ่มฟิลด์ owner
  owner_id?: string | null; 
  created_at: string;
  updated_at: string;
  template_slots?: TemplateSlot[];
  template_backgrounds?: TemplateBackground[];
}

export interface Lottery {
  id: string;
  name: string;
  template_id: string;
  is_active: boolean;
  created_at: string;
  closing_time?: string;
  icon_url?: string;
  templates?: {
    background_url: string;
    base_width: number;
    base_height: number;
  };
}

export interface GeneratePayload {
  template_id: string;
  user_seed?: string;
  // ✅ เพิ่ม target_user_id
  target_user_id?: string; 
  slot_configs: Array<{
    id: string;
    slot_type: 'system_label' | 'user_input' | 'auto_data' | 'qr_code' | 'static_text';
    data_key?: string;
  }>;
}

export interface GenerateResponse {
  results: Record<string, string>;
}
