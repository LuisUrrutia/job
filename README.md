# Resume y pipeline de trabajos

Este repositorio tiene dos partes:

- El CV y los paquetes de aplicación, que siguen viviendo en `ai/`, `latex/` y `applications/`.
- Un pipeline local con Bun para descubrir trabajos, guardar estado en SQLite y generar `Jobs.md` como reporte.

La regla importante: `Jobs.md` no es la fuente de verdad. Es una vista generada. El estado durable del pipeline vive en SQLite.

## Requisitos

Instala Bun:

```sh
brew install bun
```

Para el flujo de LaTeX/CV también necesitas las herramientas TeX:

```sh
brew install perl cpanm latexindent latexmk
wget -qO- "https://yihui.org/tinytex/install-bin-unix.sh" | sh
xargs tlmgr install < packages.txt
```

Para discovery real en LinkedIn necesitas al menos un runner con acceso a MCP configurado. Hoy el caso principal es `opencode`, porque `opencode.json` ya configura `mcp-server-linkedin`.

## Comandos principales

Ejecuta el CLI del pipeline con:

```sh
bun run jobs <comando> [opciones]
```

Comandos disponibles:

- `discover`: ejecuta un agente o fixture, guarda el raw output y normaliza candidatos en SQLite.
- `report`: genera Markdown desde SQLite. Por defecto escribe `Jobs.md`.
- `enrich`: siguiente fase, todavía stub. Será para verificar empresa, JD, website y datos extra.
- `process`: siguiente fase, todavía stub. Será para mandar trabajos aprobados al workflow existente de application package.

Validar el proyecto:

```sh
bun test
```

## Probar sin LinkedIn

Usa el runner `fixture` para comprobar que el pipeline funciona sin tocar LinkedIn ni agentes reales:

```sh
bun run jobs discover --runner fixture --db data/jobs-dev.sqlite
bun run jobs report --db data/jobs-dev.sqlite --output reports/jobs-fixture.md
```

El fixture usa datos falsos de `tests/fixtures/linkedin-discovery.json`. No lo uses para generar el `Jobs.md` real.

## Discovery real con LinkedIn

Para que OpenCode use su conexión MCP de LinkedIn:

```sh
bun run jobs discover --runner opencode --db data/jobs.sqlite
bun run jobs report --db data/jobs.sqlite
```

Eso ejecuta conceptualmente:

```sh
opencode run "<prompt de discovery>" --dir <repo>
```

El agente debe devolver JSON. El código guarda:

- stdout, stderr y exit code del agente.
- Un archivo raw en `var/jobs/raw-agent-runs*/`.
- Candidatos normalizados en SQLite.

También existen adaptadores para Codex y Claude:

```sh
bun run jobs discover --runner codex --db data/jobs.sqlite
bun run jobs discover --runner claude --db data/jobs.sqlite
```

Claude acepta configuración MCP explícita si hace falta:

```sh
bun run jobs discover --runner claude --mcp-config path/to/mcp.json --db data/jobs.sqlite
```

## Controlar el prompt desde código

El prompt default está en:

```text
src/jobs/discover/prompts.js
```

Si quieres probar otro prompt sin editar ese archivo, usa `--prompt-file`:

```sh
bun run jobs discover \
  --runner opencode \
  --prompt-file prompts/linkedin-react.md \
  --db data/jobs.sqlite
```

El prompt debe pedir JSON con esta forma:

```json
{
  "candidates": [
    {
      "title": "Role title",
      "company": "Hiring company",
      "companyWebsite": "Official website",
      "publisherCompany": "LinkedIn publisher if different",
      "url": "Canonical job URL",
      "source": "linkedin",
      "sourceJobId": "numeric LinkedIn job ID",
      "location": "Visible location",
      "remoteScope": "Remote scope",
      "employmentType": "Full-time/Contract/etc",
      "salaryRange": "Visible salary or empty string",
      "postedAt": "Visible posted date text",
      "description": "Supported JD summary",
      "verificationNote": "Why company/website are trusted"
    }
  ]
}
```

No metas decisiones de idempotencia en el prompt. El prompt descubre. El código decide qué ya existe, qué cambió y qué se reporta.

## Identidad e idempotencia

La identidad estable la controla `src/jobs/domain.js`:

- Si hay ID numérico de LinkedIn, se guarda como `linkedin:<id>`.
- Si no hay ID, se usa hash de URL canónica: `url:<hash>`.
- Como último fallback, se hashea título, empresa y source.

Cada candidato también tiene `content_hash`. Ese hash permite detectar si una publicación cambió aunque conserve el mismo ID.

## Estado local

Estos archivos son estado local y están ignorados por git:

```text
data/*.sqlite*
var/jobs/raw-agent-runs*/
```

Usa una DB de desarrollo para pruebas:

```sh
bun run jobs discover --runner fixture --db data/jobs-dev.sqlite
```

Usa la DB real para discovery real:

```sh
bun run jobs discover --runner opencode --db data/jobs.sqlite
```

## Flujo recomendado

1. Prueba el pipeline con fixture.
2. Ajusta el prompt en `src/jobs/discover/prompts.js` o con `--prompt-file`.
3. Ejecuta discovery real con `opencode`.
4. Genera `Jobs.md` con `report`.
5. En una fase posterior, usa `enrich` para completar empresa/JD/website.
6. Después, usa `process` para conectar trabajos aprobados con los skills existentes de job application.

## Relación con el workflow de aplicaciones

El pipeline nuevo no reemplaza los skills actuales. Los prepara.

Los artefactos finales siguen estas rutas:

```text
ai/{company}/{slug}-jd.json
ai/{company}/{slug}-analysis.json
ai/{company}/{slug}-application.json
ai/{company}/{slug}-cover-letter.txt
ai/{company}/{slug}-apply.json
latex/{candidate-slug}-{slug}-Resume.tex
applications/{candidate-slug}-{slug}-Resume.pdf
```

Cuando `process` esté implementado, debería llamar el workflow existente de job application después de que el usuario apruebe procesar un trabajo.

## CV y LaTeX

El CV sigue usando LaTeX. Compila desde `latex/`:

```sh
make -C latex build
make -C latex lint
make -C latex clean
```

Para generar resumes desde JSON, revisa la ayuda del script existente:

```sh
python3 scripts/generate_resume_from_json.py --help
```

No mezcles este flujo con `Jobs.md`: el pipeline de trabajos descubre oportunidades; el workflow de aplicaciones genera materiales para una oportunidad concreta.
