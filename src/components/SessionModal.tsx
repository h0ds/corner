import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface SessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ open, onOpenChange }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);

  // Mock data - replace with actual user data later
  const mockUsers = [
    { id: '1', name: 'Alice Smith', avatar: '' },
    { id: '2', name: 'Bob Johnson', avatar: '' },
    { id: '3', name: 'Carol Williams', avatar: '' },
  ];

  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleStartSession = () => {
    // TODO: Implement session start logic
    console.log('Starting session with users:', selectedUsers);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Session</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(userId => {
                const user = mockUsers.find(u => u.id === userId);
                return (
                  <div
                    key={userId}
                    className="flex items-center gap-1 bg-accent rounded-full px-2 py-1"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>{user?.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user?.name}</span>
                    <button
                      onClick={() => handleUserSelect(userId)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user.id)}
                className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors ${
                  selectedUsers.includes(user.id) ? 'bg-accent' : ''
                }`}
              >
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <span>{user.name}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleStartSession}
            disabled={selectedUsers.length === 0}
            className="w-full"
          >
            Start Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
