#!/bin/bash
echo "Starting NeuronOS..."

# Start Redis (if not running)
redis-server --daemonize yes 2>/dev/null || echo "Redis already running or not installed"

# Start backend
cd backend
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start Celery worker
celery -A app.celery_app worker --loglevel=warning &
CELERY_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $CELERY_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
