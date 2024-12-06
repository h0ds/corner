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

  const handleAvatarClick = async () => {
    try {
      const avatar = await invoke<string>('select_image');
      setSettings(prev => ({ ...prev, avatar }));
    } catch (error) {
      console.error('Failed to select image:', error);
      showToast({
        title: "Error",
        description: "Failed to select profile picture",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div 
          onClick={handleAvatarClick}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          title="Click to change profile picture"
        >
          <Avatar className="h-20 w-20">
            <AvatarImage src={settings.avatar} />
            <AvatarFallback>{settings.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">Profile Picture</h4>
          <p className="text-sm text-muted-foreground">
            Click the avatar to upload a new profile picture
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={settings.name}
          onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={settings.username}
          onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
          placeholder="Enter your username"
        />
      </div>

      <Button 
        onClick={handleSave} 
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
};
