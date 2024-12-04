use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub provider: String,
    pub messages: Vec<Message>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiMessage {
    pub role: String,
    pub parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiPart {
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiRequest {
    pub contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    pub generation_config: Option<GeminiConfig>,
    #[serde(rename = "safetySettings")]
    pub safety_settings: Option<Vec<GeminiSafetySetting>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiContent {
    pub role: String,
    pub parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiConfig {
    #[serde(rename = "maxOutputTokens")]
    pub max_output_tokens: Option<i32>,
    pub temperature: Option<f32>,
    #[serde(rename = "topK")]
    pub top_k: Option<i32>,
    #[serde(rename = "topP")]
    pub top_p: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiSafetySetting {
    pub category: String,
    pub threshold: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiResponse {
    pub candidates: Vec<GeminiCandidate>,
    pub prompt_feedback: Option<GeminiFeedback>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiCandidate {
    pub content: GeminiContent,
    pub finish_reason: Option<String>,
    pub safety_ratings: Option<Vec<GeminiSafetyRating>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiFeedback {
    pub safety_ratings: Option<Vec<GeminiSafetyRating>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiSafetyRating {
    pub category: String,
    pub probability: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrokRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrokResponse {
    pub choices: Vec<GrokChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrokChoice {
    pub message: Message,
}
