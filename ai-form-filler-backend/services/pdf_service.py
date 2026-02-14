import io
import csv
import json
from PyPDF2 import PdfReader

class PDFService:
    async def extract_text(self, file_content: bytes, filename: str) -> str:
        ext = filename.lower().split('.')[-1]
        
        if ext == 'pdf':
            return self._extract_pdf(file_content)
        elif ext == 'csv':
            return self._extract_csv(file_content)
        elif ext == 'json':
            return self._extract_json(file_content)
        elif ext == 'txt':
            return file_content.decode('utf-8', errors='ignore')
        else:
            return ""

    def _extract_pdf(self, file_content: bytes) -> str:
        text = ""
        try:
            reader = PdfReader(io.BytesIO(file_content))
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            print(f"PDF extraction error: {e}")
        return text

    def _extract_csv(self, file_content: bytes) -> str:
        text = ""
        try:
            content = file_content.decode('utf-8', errors='ignore')
            reader = csv.reader(io.StringIO(content))
            for row in reader:
                text += ", ".join(row) + "\n"
        except Exception as e:
            print(f"CSV extraction error: {e}")
        return text

    def _extract_json(self, file_content: bytes) -> str:
        try:
            data = json.loads(file_content.decode('utf-8'))
            return json.dumps(data, indent=2)
        except Exception as e:
            print(f"JSON extraction error: {e}")
            return ""
