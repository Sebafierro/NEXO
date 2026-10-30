from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import hashlib

app = FastAPI(title="NEXO OCR Service (mock)", version="1.0.0")

class OcrProvider:
    def extract(self, content: bytes) -> dict:
        h = hashlib.sha256(content).hexdigest()[:8]
        return {
            "empresa_detectada": "EMPRESA_MOCK",
            "numero_cliente": f"CLI-{h}",
            "monto_detectado": 150000.0,
            "fecha_vencimiento": None,
            "saldo_detectado": 150000.0,
            "confianza_ocr": 90.0,
            "datos_crudos": {"hash": h}
        }

provider = OcrProvider()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/extraer")
async def extraer(file: UploadFile = File(...)):
    content = await file.read()
    result = provider.extract(content)
    return result
