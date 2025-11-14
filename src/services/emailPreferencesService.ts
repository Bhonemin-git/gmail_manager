import { getSupabaseClient } from '../lib/supabase';

const supabase = getSupabaseClient();

export interface EmailPreferences {
  userEmail: string;
  sidebarWidth: number;
  sidebarOpen: boolean;
  selectedFolder: string;
  loadExternalImages: boolean;
}

export class EmailPreferencesService {
  async getPreferences(userEmail: string): Promise<EmailPreferences | null> {
    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch email preferences:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      userEmail: data.user_email,
      sidebarWidth: data.sidebar_width,
      sidebarOpen: data.sidebar_open,
      selectedFolder: data.selected_folder,
      loadExternalImages: data.load_external_images || false
    };
  }

  async updatePreferences(userEmail: string, preferences: Partial<EmailPreferences>): Promise<boolean> {
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (preferences.sidebarWidth !== undefined) {
      updates.sidebar_width = preferences.sidebarWidth;
    }
    if (preferences.sidebarOpen !== undefined) {
      updates.sidebar_open = preferences.sidebarOpen;
    }
    if (preferences.selectedFolder !== undefined) {
      updates.selected_folder = preferences.selectedFolder;
    }
    if (preferences.loadExternalImages !== undefined) {
      updates.load_external_images = preferences.loadExternalImages;
    }

    const { error } = await supabase
      .from('email_preferences')
      .upsert({
        user_email: userEmail,
        ...updates
      }, {
        onConflict: 'user_email'
      });

    if (error) {
      console.error('Failed to update email preferences:', error);
      return false;
    }

    return true;
  }

  async toggleExternalImages(userEmail: string): Promise<boolean> {
    const currentPrefs = await this.getPreferences(userEmail);
    const newValue = !(currentPrefs?.loadExternalImages || false);

    return this.updatePreferences(userEmail, {
      loadExternalImages: newValue
    });
  }
}

export const emailPreferencesService = new EmailPreferencesService();
