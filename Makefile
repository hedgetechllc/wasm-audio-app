.PHONY: all dev clean cleandist setup

all : clean
	cd wasm-audio && wasm-pack build --release --target web -- --no-default-features && cp -R pkg ../public/wasm-audio
	npm run build

dev : clean
	cd wasm-audio && wasm-pack build --dev --target web && cp -R pkg ../public/wasm-audio
	npm run dev

clean :
	rm -rf public/wasm-audio
	rm -rf wasm-audio/pkg
	cd wasm-audio && cargo clean

cleandist : clean
	rm -rf node_modules dist package-lock.json
	rm wasm-audio/Cargo.lock

setup:
	rustup target add wasm32-unknown-unknown x86_64-unknown-none
	cargo install wasm-pack
	npm install
