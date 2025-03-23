#!/bin/bash

# Update package list
apt-get update

# Install required dependencies
apt-get install -y libgtk-4-dev gstreamer1.0-plugins-bad gstreamer1.0-plugins-good \
  libenchant-2-dev libsecret-1-dev libgraphene-1.0-dev libavif-dev

# Verify installation
pkg-config --modversion gtk4

# Install Playwright
npm install @playwright/test