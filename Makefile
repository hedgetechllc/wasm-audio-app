.PHONY: all dev clean distclean setup format check

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

distclean : clean
	rm -rf node_modules dist package-lock.json
	rm wasm-audio/Cargo.lock

setup :
	rustup target add wasm32-unknown-unknown x86_64-unknown-none
	cargo install wasm-pack
	npm install

format :
	cd wasm-audio && cargo fmt

check :
	cd wasm-audio && cargo clippy -- -W clippy::all -W clippy::correctness -W clippy::suspicious -W clippy::complexity -W clippy::perf -W clippy::style -W clippy::pedantic -A clippy::module_name_repetitions -A clippy::missing_panics_doc -D warnings
