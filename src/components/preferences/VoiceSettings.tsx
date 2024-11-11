import React, { useEffect, useState } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Volume2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
}

interface VoiceSettingsProps {
  apiKey?: string;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({ apiKey }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem('elevenlabs-voice-id') || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      if (!apiKey) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': apiKey
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        
        const data = await response.json();
        setVoices(data.voices);
        
        // Get stored voice ID from backend
        const storedKeys = await invoke<any>('get_stored_api_keys');
        const storedVoiceId = storedKeys.elevenlabs_voice_id;
        
        // Set voice ID with priority: backend > localStorage > first available
        if (storedVoiceId) {
          setSelectedVoice(storedVoiceId);
          localStorage.setItem('elevenlabs-voice-id', storedVoiceId);
        } else if (!selectedVoice && data.voices.length > 0) {
          const defaultVoice = data.voices[0].voice_id;
          setSelectedVoice(defaultVoice);
          localStorage.setItem('elevenlabs-voice-id', defaultVoice);
          // Save to backend
          await invoke('store_api_key', {
            request: {
              provider: 'elevenlabs_voice_id',
              key: defaultVoice
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch voices:', error);
        setError('Failed to load available voices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, [apiKey]);

  const handleVoiceChange = async (voiceId: string) => {
    try {
      // Save to localStorage
      localStorage.setItem('elevenlabs-voice-id', voiceId);
      
      // Save to backend storage
      await invoke('store_api_key', {
        request: {
          provider: 'elevenlabs_voice_id',
          key: voiceId
        }
      });
      
      setSelectedVoice(voiceId);
      console.log('Voice ID saved:', voiceId);
    } catch (error) {
      console.error('Failed to save voice ID:', error);
      setError('Failed to save voice selection');
    }
  };

  if (!apiKey) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>Text-to-Speech Settings</span>
        </div>
        <Alert>
          <AlertDescription>
            Please configure your ElevenLabs API key in the APIs section to use text-to-speech features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        <span>Text-to-Speech Settings</span>
      </div>

      <div className="space-y-2">
        <Label>Voice</Label>
        <Select
          value={selectedVoice}
          onValueChange={handleVoiceChange}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? "Loading voices..." : "Select a voice"} />
          </SelectTrigger>
          <SelectContent>
            {voices.map((voice) => (
              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                <div className="flex flex-col">
                  <span>{voice.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {voice.category}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Selected voice will be used for text-to-speech conversion of assistant messages.
      </p>
    </div>
  );
}; 