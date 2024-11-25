import React, { useState, useCallback, useEffect } from 'react';
import { Button, Progress, message, Modal } from 'antd';
import { AudioOutlined, LoadingOutlined } from '@ant-design/icons';
import {
  checkWhisperModel,
  downloadWhisperModel,
  startRecording,
  stopRecording,
  onTranscriptionProgress,
  onDownloadProgress,
} from '../lib/tauri';

interface VoiceDictationProps {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  onTranscriptionUpdate?: (text: string) => void;
}

export function VoiceDictation({ inputRef, onTranscriptionUpdate }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelReady, setIsModelReady] = useState<boolean | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);

  const checkModel = useCallback(async () => {
    try {
      const exists = await checkWhisperModel();
      setIsModelReady(exists);
      return exists;
    } catch (error) {
      console.error('Error checking model:', error);
      setIsModelReady(false);
      return false;
    }
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      setIsDownloading(true);
      const unsubscribe = await onDownloadProgress((progress) => {
        setDownloadProgress(Number(progress.progress.toFixed(2)));
      });

      await downloadWhisperModel();
      unsubscribe();
      await checkModel();
      setIsDownloading(false);
      setIsSetupModalVisible(false);
      message.success('Model downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      message.error('Failed to download model');
      setIsDownloading(false);
    }
  }, [checkModel]);

  const handleStartRecording = useCallback(async () => {
    // Only check model status when button is first clicked
    if (isModelReady === null) {
      const exists = await checkModel();
      if (!exists) {
        setIsSetupModalVisible(true);
        return;
      }
    } else if (!isModelReady) {
      setIsSetupModalVisible(true);
      return;
    }

    try {
      await startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      message.error('Failed to start recording');
    }
  }, [isModelReady, checkModel]);

  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      message.error('Failed to stop recording');
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupTranscriptionListener() {
      unsubscribe = await onTranscriptionProgress((result) => {
        if (inputRef.current) {
          const input = inputRef.current;
          const currentValue = input.value;
          const cursorPosition = input.selectionStart || currentValue.length;
          
          // Insert transcribed text at cursor position
          const newValue = currentValue.slice(0, cursorPosition) + 
                          result.text + 
                          currentValue.slice(cursorPosition);
          
          input.value = newValue;
          
          // Update cursor position
          const newPosition = cursorPosition + result.text.length;
          input.setSelectionRange(newPosition, newPosition);
          
          // Trigger input event to update any bound values
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);

          // Call the optional callback
          onTranscriptionUpdate?.(newValue);
        }
      });
    }

    setupTranscriptionListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [inputRef, onTranscriptionUpdate]);

  return (
    <>
      <div style={{ display: 'inline-block' }}>
        <Button
          type="text"
          icon={isRecording ? <LoadingOutlined /> : <AudioOutlined />}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          danger={isRecording}
        />
      </div>

      <Modal
        title="Voice Dictation Setup"
        open={isSetupModalVisible}
        onCancel={() => setIsSetupModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsSetupModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={handleDownload}
            loading={isDownloading}
            disabled={isDownloading}
          >
            Download Model
          </Button>,
        ]}
      >
        <p>The Whisper model needs to be downloaded before using voice dictation.</p>
        {isDownloading && (
          <div style={{ marginTop: '20px' }}>
            <Progress percent={downloadProgress} status="active" />
          </div>
        )}
      </Modal>
    </>
  );
}
