.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} \
	  /^##@/        { printf "\n\033[1m%s\033[0m\n", substr($$0,5) } \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 }' \
	  $(MAKEFILE_LIST)

##@ Setup

.PHONY: setup
setup: ## Copy .env.example → .env (if absent) and install Node deps
	@[ -f .env ] || (cp .env.example .env && echo "Created .env — fill in your Supabase credentials before continuing")
	npm install

.PHONY: install
install: ## Install Node dependencies
	npm install

##@ Local development  (requires Node, Rust, and system libs on the host)

.PHONY: dev
dev: ## Start Vite dev server only — frontend HMR at http://localhost:1420
	npm run dev

.PHONY: tauri-dev
tauri-dev: ## Start full Tauri app — Vite dev server + native desktop window
	npm run tauri:dev

.PHONY: build
build: ## Type-check and build frontend to dist/
	npm run build

.PHONY: check-srd
check-srd: ## Diff rules constants against the parsed SRD tables (needs .env credentials)
	npm run check:srd

.PHONY: tauri-build
tauri-build: ## Build distributable Linux desktop app
	npm run tauri:build

##@ Android  (local — requires Android SDK + NDK configured on the host)

.PHONY: android-init
android-init: ## Generate Android project scaffold in src/tauri/gen/ (run once)
	npm run tauri:android:init

.PHONY: android-dev
android-dev: ## Start Tauri Android dev session
	npm run tauri:android:dev

.PHONY: android-build
android-build: ## Build Android APK / AAB
	npm run tauri:android:build

##@ Docker development

.PHONY: docker-dev
docker-dev: ## Start full Tauri dev environment — native window forwarded via X11/Wayland
	docker compose up dev

.PHONY: docker-dev-rebuild
docker-dev-rebuild: ## Rebuild the dev image then start
	docker compose up dev --build

##@ Docker builds

.PHONY: docker-build-linux
docker-build-linux: ## Linux desktop build → src/tauri/target/release/bundle/
	docker compose --profile build-linux run --rm build-linux

.PHONY: docker-android-init
docker-android-init: ## Generate Android scaffold in Docker (run once before docker-build-android)
	docker compose --profile build-android run --rm build-android \
		sh -c "npm ci && npm run tauri:android:init"

.PHONY: docker-build-android
docker-build-android: ## Android APK/AAB build → src/tauri/gen/android/.../outputs/
	docker compose --profile build-android run --rm build-android

##@ Database

# Substitutes percent-encoded SUPABASE_DB_PASSWORD into the [YOUR-PASSWORD] placeholder in SUPABASE_DB_URL
_ENCODE_URL = python3 -c "\
import urllib.parse, os; \
url = os.environ['SUPABASE_DB_URL']; \
pwd = urllib.parse.quote(os.environ['SUPABASE_DB_PASSWORD'], safe=''); \
print(url.replace('[YOUR-PASSWORD]', pwd))"

.PHONY: db-push
db-push: ## Deploy migrations to Supabase — set SUPABASE_DB_URL and SUPABASE_DB_PASSWORD in .env first
	@set -a && . ./.env && set +a && \
	$(_ENCODE_URL) | xargs -I{} npx supabase db push --db-url "{}"

.PHONY: db-push-dry
db-push-dry: ## Preview which migrations would be applied (no changes made)
	@set -a && . ./.env && set +a && \
	$(_ENCODE_URL) | xargs -I{} npx supabase db push --db-url "{}" --dry-run

.PHONY: db-reset-history
db-reset-history: ## Remove a failed migration from remote history so it can be re-run (usage: make db-reset-history VERSION=20260517200901)
	@set -a && . ./.env && set +a && \
	$(_ENCODE_URL) | xargs -I{} npx supabase db query \
		--db-url "{}" \
		"delete from supabase_migrations.schema_migrations where version = '$(VERSION)'"

##@ Cleanup

.PHONY: clean
clean: ## Remove build artifacts (dist/, target/)
	rm -rf dist target

.PHONY: docker-clean
docker-clean: ## Remove Docker named volumes — forces full dep reinstall on next run
	docker compose down -v
