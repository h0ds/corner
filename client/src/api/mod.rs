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
