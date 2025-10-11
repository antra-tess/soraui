#!/bin/bash

echo "🎬 Sora2 Video Platform Setup"
echo "=============================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js $(node --version) detected"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Setup backend
echo "🔧 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env and add your OPENAI_API_KEY"
fi

echo "📦 Installing backend dependencies..."
npm install

# Create data directory
mkdir -p data
mkdir -p videos
mkdir -p uploads

cd ..
echo "✓ Backend setup complete"
echo ""

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend

echo "📦 Installing frontend dependencies..."
npm install

cd ..
echo "✓ Frontend setup complete"
echo ""

echo "=============================="
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add your OPENAI_API_KEY"
echo "2. Run 'npm run dev' to start both servers"
echo "3. Open http://localhost:5173 in your browser"
echo "4. Login with username: admin, password: admin"
echo ""
echo "⚠️  Don't forget to change the default password!"
echo "=============================="

