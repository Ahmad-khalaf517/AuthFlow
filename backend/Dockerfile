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

# Lets `docker compose ps` / `depends_on: condition: service_healthy` / a
# host's own orchestrator see real app health, not just "process started" --
# uvicorn can be up while the app is still failing every request (e.g. it
# can't reach the database). Uses the stdlib instead of curl/wget so no
# extra package has to be installed into the image just for this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"

# Migrations are a deliberate separate step (`alembic upgrade head`), not
# run automatically here -- baking them into the start command races on
# every replica in a multi-instance deployment.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
