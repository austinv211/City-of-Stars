# ── Base: system build tools ──────────────────────────────────────────────────
FROM ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  curl \
  ca-certificates \
  file \
  pkg-config \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# ── Node ──────────────────────────────────────────────────────────────────────
FROM base AS node-base

ARG NODE_VERSION=24

RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# ── Rust ──────────────────────────────────────────────────────────────────────
FROM node-base AS rust-base

ENV RUSTUP_HOME=/usr/local/rustup \
  CARGO_HOME=/usr/local/cargo \
  PATH=/usr/local/cargo/bin:$PATH

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
  | sh -s -- -y --no-modify-path --default-toolchain stable \
  && rustup show

# ── Linux desktop dependencies (shared by dev + build-linux) ──────────────────
FROM rust-base AS linux-base

RUN apt-get update && apt-get install -y --no-install-recommends \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev \
  patchelf \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Development: interactive with X11/Wayland window forwarding ───────────────
FROM linux-base AS dev

# No CMD — command provided by docker-compose

# ── Linux production build ────────────────────────────────────────────────────
FROM linux-base AS build-linux

CMD ["sh", "-c", "npm ci && npm run tauri:build"]

# ── Android build ─────────────────────────────────────────────────────────────
FROM rust-base AS build-android

ARG ANDROID_API=34
ARG ANDROID_BUILD_TOOLS=34.0.0
ARG ANDROID_NDK_VERSION=27.0.12077973
ARG CMDTOOLS_BUILD=11076708

ENV ANDROID_HOME=/opt/android-sdk \
  JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
  PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
  openjdk-17-jdk-headless \
  unzip \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p $ANDROID_HOME/cmdline-tools \
  && curl -o /tmp/cmdtools.zip \
  "https://dl.google.com/android/repository/commandlinetools-linux-${CMDTOOLS_BUILD}_latest.zip" \
  && unzip -q /tmp/cmdtools.zip -d /tmp \
  && mv /tmp/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
  && rm /tmp/cmdtools.zip

RUN yes | sdkmanager --licenses \
  && sdkmanager \
  "platform-tools" \
  "platforms;android-${ANDROID_API}" \
  "build-tools;${ANDROID_BUILD_TOOLS}" \
  "ndk;${ANDROID_NDK_VERSION}"

ENV ANDROID_NDK_HOME=$ANDROID_HOME/ndk/$ANDROID_NDK_VERSION

RUN rustup target add \
  aarch64-linux-android \
  armv7-linux-androideabi \
  i686-linux-android \
  x86_64-linux-android

WORKDIR /app

CMD ["sh", "-c", "npm ci && npm run tauri:android:build"]
