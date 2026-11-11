FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
# Cloud Run sets $PORT. CPU only during requests (the default): no always-on instances.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2
