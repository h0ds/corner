import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoModal({ open: isOpen, onOpenChange }: InfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Corner</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            A free, open-source, model agnostic AI-powered chat and note-taking app that helps you think, write, and create.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Current Version</p>
            <p className="text-sm text-muted-foreground">1.0.0</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Links</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => open('https://corner.ac')}
              >
                Website
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => open('https://github.com/h0ds/corner')}
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
