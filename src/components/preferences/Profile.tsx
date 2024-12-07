import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface ProfileProps {
  name: string;
  profilePicture: string | null;
  onNameChange: (value: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
  error?: string | null;
}

export const Profile = ({
  name,
  profilePicture,
  onNameChange,
  onImageUpload,
  isSaving = false,
  error = null
}: ProfileProps) => {
  const [inputValue, setInputValue] = useState(name);
  const hasUnsavedChanges = inputValue !== name;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    onNameChange(inputValue);
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

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="name"
            value={inputValue}
            onChange={handleNameChange}
            placeholder="Enter your name"
            disabled={isSaving}
            className="flex-1"
            maxLength={50}
            onBlur={handleSave}
          />
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            variant={hasUnsavedChanges ? "default" : "secondary"}
            size="sm"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          This name will be displayed when you hover over your profile picture
        </p>
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};
