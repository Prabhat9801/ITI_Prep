"""Multi-AI Provider System - supports OpenAI, Groq, Cerebras, Mistral, Grok."""
import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

# ─── Provider Registry ───────────────────────────────────────────────
PROVIDERS = {}

def _env(key, default=""):
    return os.getenv(key, default)

def _get_keys(prefix: str) -> list:
    """Helper to load main key and up to 100 backup keys."""
    keys = []
    # Check numbered backup keys first (or just loop)
    for i in range(1, 100):
        key = _env(f"{prefix}_{i}")
        if key and key != "your-openai-api-key-here":
            keys.append(key)
    
    # Check main single key
    single = _env(prefix)
    if single and single != "your-openai-api-key-here":
        keys.insert(0, single)
        
    return keys

# Build provider configs dynamically from .env
def _init_providers():
    global PROVIDERS
    PROVIDERS = {}

    # OpenAI
    openai_keys = _get_keys("OPENAI_API_KEY")
    if openai_keys:
        PROVIDERS["openai"] = {
            "name": "OpenAI",
            "model": "gpt-4o-mini",
            "base_url": "https://api.openai.com/v1/chat/completions",
            "api_key": openai_keys[0],
            "api_keys": openai_keys,
            "icon": "🟢",
            "speed": "medium",
        }

    # Groq (Llama)
    groq_keys = _get_keys("GROQ_API_KEY")
    if groq_keys:
        PROVIDERS["groq"] = {
            "name": "Groq (Llama)",
            "model": "llama-3.1-8b-instant",
            "base_url": "https://api.groq.com/openai/v1/chat/completions",
            "api_key": groq_keys[0],
            "api_keys": groq_keys,
            "icon": "🟠",
            "speed": "fast",
        }

    # Cerebras
    cerebras_keys = _get_keys("CEREBRAS_API_KEY")
    if cerebras_keys:
        PROVIDERS["cerebras"] = {
            "name": "Cerebras",
            "model": "llama3.1-8b",
            "base_url": "https://api.cerebras.ai/v1/chat/completions",
            "api_key": cerebras_keys[0],
            "api_keys": cerebras_keys,
            "icon": "🔵",
            "speed": "ultra-fast",
        }

    # Mistral
    mistral_keys = _get_keys("MISTRAL_API_KEY")
    if mistral_keys:
        PROVIDERS["mistral"] = {
            "name": "Mistral",
            "model": "mistral-small-latest",
            "base_url": "https://api.mistral.ai/v1/chat/completions",
            "api_key": mistral_keys[0],
            "api_keys": mistral_keys,
            "icon": "🟣",
            "speed": "fast",
        }

    # Grok (xAI)
    grok_keys = _get_keys("GROK_API_KEY")
    if grok_keys:
        PROVIDERS["grok"] = {
            "name": "Grok (xAI)",
            "model": "grok-3-mini-fast",
            "base_url": "https://api.x.ai/v1/chat/completions",
            "api_key": grok_keys[0],
            "api_keys": grok_keys,
            "icon": "⚫",
            "speed": "fast",
        }

_init_providers()

# ─── Core API Call ────────────────────────────────────────────────────
def call_ai(provider_id: str, messages: list, temperature: float = 0.7, max_tokens: int = 2000) -> str:
    """Call any AI provider with unified interface. Returns response text.
    When provider_id is 'auto', tries each provider in priority order until one succeeds."""
    
    if provider_id == "auto" or provider_id not in PROVIDERS:
        return _call_auto(messages, temperature, max_tokens)
    
    provider = PROVIDERS[provider_id]
    
    # Use key rotation if multiple keys exist
    if "api_keys" in provider and len(provider["api_keys"]) > 1:
        return _call_with_rotation(provider, messages, temperature, max_tokens)
    
    return _make_request(provider, messages, temperature, max_tokens)


def _call_auto(messages: list, temperature: float, max_tokens: int) -> str:
    """Try providers in priority order, skip ones that fail."""
    priority = ["groq", "cerebras", "openai", "mistral", "grok"]
    errors = []
    
    for pid in priority:
        if pid not in PROVIDERS:
            continue
            
        p = PROVIDERS[pid]
        try:
            if "api_keys" in p and len(p["api_keys"]) > 1:
                result = _call_with_rotation(p, messages, temperature, max_tokens)
            else:
                result = _make_request(p, messages, temperature, max_tokens)
                
            # Check if result is an error message
            if result.startswith("⚠️"):
                errors.append(f"{pid}: {result}")
                continue
            return result
        except Exception as e:
            errors.append(f"{pid}: {str(e)}")
            continue
    
    if errors:
        return f"⚠️ All AI providers failed. Errors:\n" + "\n".join(errors)
    return "⚠️ No AI provider configured. Please add API keys in .env file."


def _make_request(provider: dict, messages: list, temperature: float, max_tokens: int) -> str:
    """Make HTTP request to AI provider."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {provider['api_key']}"
    }
    
    payload = {
        "model": provider["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(provider["base_url"], headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        return f"⚠️ Error from {provider['name']}: {e.response.status_code} {e.response.reason_phrase}"
    except Exception as e:
        return f"⚠️ Error from {provider['name']}: {str(e)}"


def _call_with_rotation(provider: dict, messages: list, temperature: float, max_tokens: int) -> str:
    """Try multiple API keys using Sticky Round-Robin rotation.
    It stays on a working key until it fails, then moves to the next.
    Eventually it loops back to the first key (which resets the next day)."""
    keys = provider.get("api_keys", [provider["api_key"]])
    num_keys = len(keys)
    last_error = ""
    
    # Start from the index that worked last time
    start_idx = provider.get("_key_index", 0)
    
    for i in range(num_keys):
        curr_idx = (start_idx + i) % num_keys
        key = keys[curr_idx]
        
        try:
            p = {**provider, "api_key": key}
            result = _make_request(p, messages, temperature, max_tokens)
            
            if not result.startswith("⚠️ Error"):
                # Success! Save this index so we start here next time
                provider["_key_index"] = curr_idx
                return result
                
            last_error = result
        except Exception as e:
            last_error = str(e)
            
        # If it failed, advance the index for the next request
        provider["_key_index"] = (curr_idx + 1) % num_keys
    
    return f"⚠️ All {provider['name']} keys failed. Last error: {last_error}"


def get_available_providers() -> list:
    """Return list of available providers for frontend."""
    return [
        {
            "id": pid,
            "name": p["name"],
            "model": p["model"],
            "icon": p["icon"],
            "speed": p["speed"],
        }
        for pid, p in PROVIDERS.items()
    ]


def reload_providers():
    """Reload providers from .env (useful after key changes)."""
    load_dotenv(override=True)
    _init_providers()
