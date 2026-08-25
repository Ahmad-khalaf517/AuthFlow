FROM python:3.11-slim

WORKDIR /app

# Copied and installed before the rest of the source so this layer is
# cached across builds that only change application code.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

# Migrations are a deliberate separate step (`alembic upgrade head`), not
# run automatically here -- baking them into the start command races on
# every replica in a multi-instance deployment.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
