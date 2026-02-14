from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from services.groq_service import GroqService
from services.pdf_service import PDFService
from services.db_service import DBService
from models import Profile, AutoFillRequest, AutoFillResponse, UploadResponse, Address
import uvicorn
import os

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Chrome Extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
groq_service = GroqService()
pdf_service = PDFService()
db_service = DBService()

@app.on_event("startup")
async def startup():
    await db_service.init_db()

# Auth / Validation
@app.post("/api/auth/validate")
async def validate_key(authorization: str = Header(None)):
    # If header provided, validate it. If not, validate env key.
    # GroqService.validate_key handles None by checking self.api_key (env)
    is_valid = await groq_service.validate_key(authorization)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid API Key (Header or Env)")
    return {"status": "valid"}

# Profile Management
@app.post("/api/profile")
async def save_profile(profile: Profile, authorization: str = Header(None)):
    # Auth check (optional if env key present, but good practice to validate)
    if not await groq_service.validate_key(authorization):
         raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # Save to DB
        new_id = await db_service.save_profile(profile)
        return {"id": new_id, "message": "Profile saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile/{profile_id}")
async def get_profile(profile_id: int):
    profile = await db_service.get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# File Upload & Extraction
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), authorization: str = Header(None)):
    # Upload doesn't strictly need Groq key unless we parse with LLM immediately
    # But let's keep it consistent
    if not await groq_service.validate_key(authorization):
         raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        content = await file.read()
        extracted_text = await pdf_service.extract_text(content, file.filename)
        
        # Save extracted text to profile (defaulting to ID 1 for now)
        current_profile = await db_service.get_profile(1)
        if not current_profile:
            current_profile = Profile(id=1, extracted_text=extracted_text) # Create new if empty
        else:
            current_profile.extracted_text = extracted_text # Update existing
            
        await db_service.save_profile(current_profile)

        return {
            "filename": file.filename,
            "message": "File processed and text extracted",
            "extracted_length": len(extracted_text)
        }
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Auto-Fill
@app.post("/api/autofill")
async def autofill(request: AutoFillRequest, authorization: str = Header(None)):
    # Pass header key if present, otherwise service uses env key
    if authorization:
        groq_service.set_api_key(authorization)
    
    # Validate before proceeding (ensure *some* key is set)
    if not await groq_service.validate_key():
         raise HTTPException(status_code=401, detail="Missing or Invalid API Key")
    
    # Get Profile + Extracted Text
    profile = await db_service.get_profile(request.profile_id)
    profile_data = profile.dict() if profile else {}
    extracted_text = profile_data.get('extracted_text', "")
    
    # Call Groq
    filled_fields = await groq_service.generate_autofill(
        form_fields=[f.dict() for f in request.form_data],
        user_profile=profile_data,
        extracted_text=extracted_text
    )
    
    return {"filled_data": filled_fields}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
