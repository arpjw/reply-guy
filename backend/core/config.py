from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str
    redis_url: str
    x_username: str
    x_password: str
    twitter_client_id: str = ""
    twitter_client_secret: str = ""
    jwt_secret: str = "change-me-in-production"

    model_config = {"env_file": "../.env", "extra": "ignore"}

settings = Settings()