from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    fireworks_api_key: str = ""  # Make it optional with empty string default
    flower_mgmt_key: str = ""  # Flower management API key
    flower_proj_id: str = ""  # Flower project ID
    log_level: str = "INFO"  # Default log level

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
