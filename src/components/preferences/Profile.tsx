import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { showToast } from '@/lib/toast';

interface ProfileSettings {
  name: string;
  username: string;
  avatar: string;
}

export const Profile = () => {
  const [settings, setSettings] = useState<ProfileSettings>({
    name: '',
    username: '',
    avatar: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await invoke<ProfileSettings>('load_profile_settings');
      setSettings(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke('save_profile_settings', { settings });
      showToast({
        title: "Success",
        description: "Profile settings saved successfully",
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast({
        title: "Error",
        description: "Failed to save profile settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      const base64Image = await invoke<string>('select_image');
      if (base64Image) {
        setSettings(prev => ({ ...prev, avatar: base64Image }));
        await handleSave();
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      showToast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="relative group cursor-pointer" onClick={handleImageUpload}>
          <Avatar className="h-24 w-24 ring-2 ring-transparent transition-all group-hover:ring-primary/20">
            <AvatarImage src={settings.avatar} />
            <AvatarFallback className="bg-muted">
              {settings.name ? settings.name[0].toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            Change Photo
          </div>
        </div>
        <div className="space-y-4 flex-1">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              value={settings.name}
              onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              type="text"
              id="username"
              value={settings.username}
              onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Your username"
            />
          </div>
        </div>
      </div>
      <Button 
        onClick={handleSave} 
        disabled={isSaving}
        className="w-full max-w-sm"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
};
