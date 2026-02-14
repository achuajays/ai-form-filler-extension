import os
import json
from dotenv import load_dotenv
from groq import AsyncGroq
from typing import List, Dict, Any
from models import FormField

load_dotenv()

class GroqService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = AsyncGroq(api_key=self.api_key) if self.api_key else None
        self.model = "meta-llama/llama-4-scout-17b-16e-instruct" 

    def set_api_key(self, api_key: str):
        # Override env with provided key if needed, or stick to env?
        # Let's assume passed key overrides env for flexibility, or fallback for env
        if api_key:
            self.api_key = api_key
            self.client = AsyncGroq(api_key=api_key)
        elif not self.client and not self.api_key:
             # Try reloading?
             self.api_key = os.getenv("GROQ_API_KEY")
             if self.api_key:
                 self.client = AsyncGroq(api_key=self.api_key)

    async def validate_key(self, api_key: str = None) -> bool:
        key_to_test = api_key or self.api_key
        if not key_to_test:
            return False

        try:
            temp_client = AsyncGroq(api_key=key_to_test)
            # Simple call to test key
            await temp_client.chat.completions.create(
                model="llama-3.1-8b-instant", # Use cheap model for validation
                messages=[{"role": "user", "content": "ping"}]
            )
            return True
        except Exception as e:
            print(f"Validation error: {e}")
            return False

    async def generate_autofill(self, form_fields: List[Dict[str, Any]], user_profile: Dict[str, Any], extracted_text: str = "") -> List[Dict[str, Any]]:
        if not self.client:
             # Try refreshing from env in case it wasn't set initially
            self.api_key = os.getenv("GROQ_API_KEY")
            if self.api_key:
                self.client = AsyncGroq(api_key=self.api_key)
        
        if not self.client:
            raise ValueError("Groq client not initialized. Set API key in .env or provide it.")

        # Construct context from profile and extracted text
        context = f"User Profile: {json.dumps(user_profile)}\n\n"
        if extracted_text:
            context += f"Extracted Document Content (Priority): {extracted_text[:4000]}...\n" # Limit context

        system_prompt = f"""You are an intelligent form-filling assistant. 
        Your task is to fill in the provided form fields based on the User Profile and Extracted Document Content.
        
        Rules:
        1. Use Extracted Document Content as the primary source of truth if available.
        2. Fallback to User Profile if data is missing in document.
        3. If a field cannot be filled, leave 'value' as null or empty string.
        4. Return ONLY a JSON object with a 'filled_data' key containing the list of fields with updated 'value'.
        5. Do not hallucinate data.
        
        Context:
        {context}
        """

        user_message = f"Form Fields to Fill: {json.dumps(form_fields)}"

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            return result.get("filled_data", [])

        except Exception as e:
            print(f"Groq API error: {e}")
            return []
