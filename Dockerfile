FROM python:3.11-slim


WORKDIR /app

# Install Python deps first (better caching)
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the app
COPY backend /app/backend
COPY frontend /app/frontend

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["python", "backend/app.py"]
