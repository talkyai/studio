#[path = "ollama/query.rs"]
pub mod query;
#[path = "ollama/models.rs"]
pub mod models;
#[path = "ollama/server.rs"]
pub mod server;
#[path = "ollama/links.rs"]
pub mod links;

pub use query::query_ollama;
pub use models::list_ollama_models;
pub use server::start_ollama_server;
