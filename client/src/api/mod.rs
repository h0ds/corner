use std::sync::Mutex;

pub mod chat;
pub mod speech;

pub struct ApiKeys {
    pub anthropic: Mutex<Option<String>>,
    pub perplexity: Mutex<Option<String>>,
    pub openai: Mutex<Option<String>>,
    pub xai: Mutex<Option<String>>,
    pub google: Mutex<Option<String>>,
    pub elevenlabs: Mutex<Option<String>>,
}

impl ApiKeys {
    pub fn set_key(&self, provider: &str, key: String) {
        match provider {
            "anthropic" => *self.anthropic.lock().unwrap() = Some(key),
            "perplexity" => *self.perplexity.lock().unwrap() = Some(key),
            "openai" => *self.openai.lock().unwrap() = Some(key),
            "xai" => *self.xai.lock().unwrap() = Some(key),
            "google" => *self.google.lock().unwrap() = Some(key),
            "elevenlabs" => *self.elevenlabs.lock().unwrap() = Some(key),
            _ => {}
        }
    }

    pub fn get_key(&self, provider: &str) -> Option<String> {
        match provider {
            "anthropic" => self.anthropic.lock().unwrap().clone(),
            "perplexity" => self.perplexity.lock().unwrap().clone(),
            "openai" => self.openai.lock().unwrap().clone(),
            "xai" => self.xai.lock().unwrap().clone(),
            "google" => self.google.lock().unwrap().clone(),
            "elevenlabs" => self.elevenlabs.lock().unwrap().clone(),
            _ => None,
        }
    }
}
