import { toast } from '@/hooks/use-toast';

interface ToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export const showToast = ({ title, description, variant = 'default', duration = 3000 }: ToastOptions) => {
  toast({
    title,
    description,
    variant,
    duration,
  });
}; 