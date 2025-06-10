#!/bin/bash

# Build Flower Intelligence TypeScript library

echo "Building Flower Intelligence library..."

cd flower/intelligence/ts

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Flower dependencies..."
    pnpm install
fi

# Build the library
echo "Building Flower..."
pnpm build

echo "Flower Intelligence build complete!"