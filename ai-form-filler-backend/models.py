from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class FormField(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    label: Optional[str] = None
    placeholder: Optional[str] = None
    type: str # text, email, password, etc.
    value: Optional[str] = None

class AutoFillRequest(BaseModel):
    form_data: List[FormField]
    profile_id: int = 1

class AutoFillResponse(BaseModel):
    filled_data: List[FormField]

class Address(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None

class Profile(BaseModel):
    id: Optional[int] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    jobTitle: Optional[str] = None
    address: Optional[Address] = None
    extracted_text: Optional[str] = None # Stores text from uploaded docs

class UploadResponse(BaseModel):
    filename: str
    extracted_data: Dict[str, Any]
    message: str
