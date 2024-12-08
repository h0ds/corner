import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface ProfileProps {
  name: string;
  username: string;
  profilePicture?: string;
  onNameChange: (name: string) => void;
  onUsernameChange: (username: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
  error?: string | null;
}

export const Profile: React.FC<ProfileProps> = ({
  name,
  username,
  profilePicture,
  onNameChange,
  onUsernameChange,
  onImageUpload,
  isSaving,
  error,
}) => {
  const [inputValue, setInputValue] = useState(name);
  const [usernameValue, setUsernameValue] = useState(username);
  const hasUnsavedChanges = inputValue !== name || usernameValue !== username;

  useEffect(() => {
    setInputValue(name);
  }, [name]);

  useEffect(() => {
    setUsernameValue(username);
  }, [username]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onNameChange(newValue);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUsernameValue(newValue);
    onUsernameChange(newValue);
  };

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    if (inputValue !== name) onNameChange(inputValue);
    if (usernameValue !== username) onUsernameChange(usernameValue);
  };

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = onImageUpload;
    input.click();
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
            <AvatarImage src={profilePicture || undefined} />
            <AvatarFallback>
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">Profile Picture</h4>
          <p className="text-sm text-muted-foreground">
            Click the avatar to upload a new profile picture
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={inputValue}
            onChange={handleNameChange}
            disabled={isSaving}
            maxLength={50}
          />
          <p className="text-sm text-muted-foreground">
            This name will be displayed when you hover over your profile picture
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="Enter your username"
            value={usernameValue}
            onChange={handleUsernameChange}
            disabled={isSaving}
            maxLength={30}
          />
          <p className="text-sm text-muted-foreground">
            Your username will be used to identify you in the app
          </p>
        </div>
        <div className="space-y-2">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            variant={hasUnsavedChanges ? "default" : "secondary"}
            size="sm"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};
