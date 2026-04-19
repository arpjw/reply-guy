from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str
    redis_url: str
    x_username: str
    x_password: str

    model_config = {"env_file": "../.env", "extra": "ignore"}

settings = Settings()