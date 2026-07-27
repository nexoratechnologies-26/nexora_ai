# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set the working directory in the container
WORKDIR /backend

# Install system dependencies (including support for OCR libraries like Tesseract if desired)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install python packages
COPY requirements.txt /backend/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code to container working directory
COPY . /backend/

# Expose port
EXPOSE 8000

# Run FastAPI app
CMD ["python", "main.py"]
