LATEXMK ?= latexmk
LUALATEX_FLAGS := -lualatex -interaction=nonstopmode -halt-on-error
CHKTEX_FALLBACK := $(HOME)/Library/TinyTeX/bin/universal-darwin/chktex
CHKTEX_FLAGS := -q -n1 -n2 -n8 -n13 -n24 -n26

LATEST_RESUME = $(shell python3 -c "from pathlib import Path; excluded={'main-cols.tex','resume.template.tex'}; files=[p for p in Path('.').glob('*.tex') if p.name not in excluded]; files.sort(key=lambda p: p.stat().st_mtime, reverse=True); print(files[0].name if files else 'resume.tex')")
MAIN_RESUME = $(LATEST_RESUME)
ALT_RESUME := main-cols.tex

.PHONY: build build-main build-cols watch lint clean

build: build-main build-cols

build-main:
	@echo "Building $(MAIN_RESUME)"
	$(LATEXMK) $(LUALATEX_FLAGS) $(MAIN_RESUME)

build-cols:
	$(LATEXMK) $(LUALATEX_FLAGS) $(ALT_RESUME)

watch:
	$(LATEXMK) -pvc $(LUALATEX_FLAGS) $(MAIN_RESUME)

lint:
	@if command -v chktex >/dev/null 2>&1; then \
		chktex $(CHKTEX_FLAGS) $(MAIN_RESUME) $(ALT_RESUME); \
	else \
		$(CHKTEX_FALLBACK) $(CHKTEX_FLAGS) $(MAIN_RESUME) $(ALT_RESUME); \
	fi

clean:
	$(LATEXMK) -C $(MAIN_RESUME)
	$(LATEXMK) -C $(ALT_RESUME)
	@rm -f *.aux *.fdb_latexmk *.fls *.log *.gz *.out *.toc *.synctex.gz *.xdv *.dvi *.bbl *.blg *.nav *.snm
