use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub content: Vec<ChatResponseContent>,
    pub model: String,
    pub role: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChatResponseContent {
    pub text: String,
    #[serde(rename = "type")]
    pub content_type: String,
}

#[derive(Serialize, Deserialize)]
pub struct PerplexityResponse {
    pub choices: Vec<PerplexityChoice>,
}

#[derive(Serialize, Deserialize)]
pub struct PerplexityChoice {
    pub message: PerplexityMessage,
}

#[derive(Serialize, Deserialize)]
pub struct PerplexityMessage {
    pub content: String,
    #[serde(default)]
    pub citations: Vec<PerplexityCitation>,
}

#[derive(Serialize, Deserialize)]
pub struct PerplexityCitation {
    pub text: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub content: Option<String>,
    pub error: Option<String>,
    pub citations: Option<Vec<Citation>>,
    pub images: Option<Vec<String>>,
    pub related_questions: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct VerifyRequest {
    pub key: String,
    pub provider: String,
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub message: String,
    pub model: String,
    pub provider: String,
    pub file_content: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Citation {
    pub url: String,
    pub title: Option<String>,
}
