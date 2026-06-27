# Resume y pipeline de trabajos

Este repositorio tiene dos partes:

- El CV y los paquetes de aplicación, que siguen viviendo en `ai/`, `latex/` y `applications/`.
- Un pipeline local con Node para descubrir trabajos y guardar estado durable en SQLite.

La regla importante: SQLite es la fuente de verdad del pipeline. Los archivos JSON de debug son opcionales y no forman parte del estado principal.

## Requisitos

Instala Node.js 26 o superior para el pipeline de trabajos y el generador TypeScript de resumes. El módulo `node:sqlite` y la ejecución directa de `.ts` forman parte del runtime:

```sh
node --version
```

Para el flujo de LaTeX/CV también necesitas las herramientas TeX:

```sh
brew install perl cpanm latexindent latexmk
wget -qO- "https://yihui.org/tinytex/install-bin-unix.sh" | sh
xargs tlmgr install < packages.txt
```

Para discovery real en LinkedIn necesitas al menos un runner con acceso a MCP configurado. Hoy el caso principal es `opencode`, porque `opencode.json` ya configura `mcp-server-linkedin`. El prompt default apunta a trabajos remotos React/TypeScript en UK, US y Unión Europea, y pide al agente devolver al menos 10 candidatos cuando LinkedIn tenga suficientes resultados válidos.

## Comandos principales

Ejecuta el CLI del pipeline con:

```sh
npm run jobs -- <comando> [opciones]
```

Comandos disponibles:

- `discover`: ejecuta búsquedas livianas, normaliza candidatos search-only en SQLite.
- `enrich`: obtiene JD, empresa real y website para candidatos guardados, procesando uno por vez.
- `fit`: analiza candidatos enriquecidos y clasifica `apply`, `weak_apply` o `dont_apply`.
- `research-application`: busca apply URL oficial, perfil de empresa reutilizable y respuestas sugeridas para preguntas visibles.
- `build-resume`: genera solo el PDF del resume y guarda su ruta en SQLite.
- `process`: siguiente fase, todavía stub. Será para mandar trabajos aprobados al workflow existente de application package.

Validar el proyecto:

```sh
npm run test:jobs
```

## Probar sin LinkedIn

Usa el runner `fixture` para comprobar que el pipeline funciona sin tocar LinkedIn ni agentes reales:

```sh
npm run jobs -- discover --runner fixture --db data/jobs-dev.sqlite
```

El fixture usa datos falsos de `tests/fixtures/linkedin-discovery.json`. Solo sirve para probar el pipeline local.

## Discovery real con LinkedIn

La forma recomendada es separar discovery de enrichment. Discovery solo busca publicaciones con `search_jobs`, filtra por título y guarda candidatos search-only en SQLite. Enrichment procesa esos candidatos después, obtiene JD/details y verifica website.

Pídele al agente algo como:

```text
Usa la skill linkedin-job-discovery para buscar trabajos React remotos en UK, US y EU, y guarda los resultados en data/jobs.sqlite.
```

Discovery usa solo `mcp-server-linkedin_search_jobs`. Para runners reales, el CLI lanza una corrida por término: `React`, `Typescript`, `Frontend` y `full-stack`; cada corrida recorre tres páginas cuando LinkedIn lo permite. Luego Job candidate intake mergea salidas exitosas, normaliza, dedupea por identidad estable y guarda en SQLite. Discovery no ejecuta Defender: guarda candidatos completos que se alinean con el prompt.

Si usas la skill manualmente, persiste el JSON search-only con:

```sh
node linkedin-job-discovery/scripts/persist-discovery.mjs \
  --input path/to/discovery.json \
  --db data/jobs.sqlite
```

Si quieres ejecutar el runner CLI antiguo para debug técnico:

```sh
npm run jobs -- discover --runner opencode --db data/jobs.sqlite
```

Eso ejecuta conceptualmente:

```sh
opencode run "<prompt de discovery>" --dir <repo>
```

Tanto la skill como el runner CLI esperan JSON. El código guarda:

- stdout, stderr y exit code del agente.
- Un archivo JSON raw solo si pasas `--debug-json <file>` o `--debug-json-dir <dir>`.
- Candidatos normalizados en SQLite.

El mensaje final separa los números importantes: `normalized` son candidatos completos después de parsear el JSON, `saved` es lo que quedó guardado, `rejected` son candidatos incompletos (por ejemplo sin título, empresa o URL), y `skipped` aparece en enrichment para candidatos ignorados por prompt injection.

Defender empieza en enrichment, donde el pipeline obtiene JD/details y trata ese texto como contenido no confiable. Si Defender detecta prompt injection de alto riesgo, el run queda registrado en SQLite, ese candidato se ignora, y el resto de candidatos seguros continúa. Si además activaste JSON de debug, también queda guardado el raw output del runner.

Por defecto Defender corre en enrichment con Tier 1 y Tier 2 activados. Tier 2 usa el clasificador ONNX en un subproceso Node aislado, para que un cierre nativo raro del runtime no tumbe el proceso principal de Node después de devolver el resultado. Si necesitas apagar Tier 2 para una corrida concreta:

```sh
JOBS_DEFENDER_TIER2=0 npm run jobs -- enrich --runner opencode --db data/jobs.sqlite
```

Para ver el prompt, el runner usado y la normalización, añade `--verbose`. En enrichment también muestra el resultado de Defender:

```sh
npm run jobs -- discover --runner opencode --db data/jobs.sqlite --verbose
```

También existen adaptadores para Codex y Claude:

```sh
npm run jobs -- discover --runner codex --db data/jobs.sqlite
npm run jobs -- discover --runner claude --db data/jobs.sqlite
```

Claude acepta configuración MCP explícita si hace falta:

```sh
npm run jobs -- discover --runner claude --mcp-config path/to/mcp.json --db data/jobs.sqlite
```

## Controlar el prompt desde código

El prompt default está en:

```text
src/jobs/discover/prompts.ts
```

Si quieres probar otro prompt sin editar ese archivo, usa `--prompt-file`:

```sh
npm run jobs -- discover \
  --runner opencode \
  --prompt-file prompts/linkedin-react.md \
  --db data/jobs.sqlite
```

El prompt debe pedir JSON con esta forma y un lote útil de candidatos. El default pide al menos 10 candidatos elegibles antes de terminar, salvo que LinkedIn no entregue suficientes resultados válidos:

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

No metas decisiones de idempotencia en el prompt. El prompt descubre. El código decide qué ya existe, qué cambió y qué pasa a las fases siguientes.

## Identidad e idempotencia

La identidad estable la controla `src/jobs/domain.ts`:

- Si hay ID numérico de LinkedIn, se guarda como `linkedin:<id>`.
- El ID numérico también se persiste en la columna `source_job_id` para auditoría.
- Si no hay ID, se usa hash de URL canónica: `url:<hash>`.
- Como último fallback, se hashea título, empresa y source.

Cada candidato también tiene `content_hash`. Ese hash permite detectar si una publicación cambió aunque conserve el mismo ID.

## Estado local

Estos archivos son estado local y están ignorados por git:

```text
data/*.sqlite*
var/jobs/raw-agent-runs*/
```

`discover` no escribe archivos JSON de debug por defecto. Si quieres guardar una corrida para debug:

```sh
npm run jobs -- discover --runner opencode --db data/jobs.sqlite --debug-json var/jobs/raw-agent-runs/latest.json
```

Usa una DB de desarrollo para pruebas:

```sh
npm run jobs -- discover --runner fixture --db data/jobs-dev.sqlite
```

Para discovery real, usa la skill y deja que persista en la DB real:

```text
Usa la skill linkedin-job-discovery para buscar trabajos React remotos en UK, US y EU, y guarda los resultados en data/jobs.sqlite.
```

## Enrichment

Después de discovery, ejecuta enrichment para completar JD y website:

```sh
npm run jobs -- enrich --runner opencode --db data/jobs.sqlite
```

`enrich` lee candidatos sin `description` o sin `company_website` y los procesa de a uno. Cada agente debe resolver details/JD y website para un solo job; el proceso padre vuelve a pasar Defender y re-upsertea la misma fila en SQLite.

## Fit analysis

Después de enrichment, ejecuta fit para clasificar candidatos enriquecidos:

```sh
npm run jobs -- fit --runner opencode --db data/jobs.sqlite
```

`fit` lee candidatos con `description` y `company_website`, carga `info.json`, analiza un candidato a la vez y persiste `fit_decision`, `fit_score`, `fit_summary`, `fit_risks` y `fit_evidence`. Esta fase solo decide si conviene aplicar; no genera resume, PDF, cover letter ni respuestas de aplicación.

## Application research

Después de `fit`, ejecuta research solo para candidatos `apply` o `weak_apply`:

```sh
npm run jobs -- research-application --runner opencode --db data/jobs.sqlite
```

`research-application` guarda información reutilizable de la empresa en `companies`, guarda el `apply_url` específico de la oferta en `candidates`, y guarda cada pregunta visible con una respuesta sugerida en `application_questions`. Las respuestas son referencia para revisión humana; el comando no envía aplicaciones ni genera resume/PDF/cover letter.

## Build resume

Después de `research-application`, genera el paquete de resume para candidatos con `apply` o `weak_apply`:

```sh
npm run jobs -- build-resume --runner opencode --db data/jobs.sqlite
```

`build-resume` carga `info.json`, company research y preguntas visibles; pide un JSON tailor-made compatible con `src/resume/generator.ts` como entrada temporal; compila `applications/{candidate-slug}-{slug}-Resume.pdf`; y guarda solo `resume_pdf_path` y `resume_generated_at` en `candidates`. Usa `--output-root <path>` para escribir el PDF fuera del directorio actual.

## Flujo recomendado

1. Ejecuta discovery real search-only para poblar SQLite.
2. Audita los títulos guardados si algo se ve raro.
3. Ejecuta `enrich` en modo serial para completar JD, empresa y website.
4. Ejecuta `fit` para clasificar `apply`, `weak_apply` o `dont_apply`.
5. Ejecuta `research-application` para buenos fits.
6. Ejecuta `build-resume` para generar el PDF del resume.
7. Usa SQLite como fuente de verdad; los JSON de debug son solo inspección.
8. En una fase posterior, conecta trabajos aprobados con los skills existentes de job application.

## Relación con el workflow de aplicaciones

El pipeline nuevo no reemplaza los skills actuales. Los prepara.

Los artefactos finales siguen estas rutas:

```text
ai/{company}/{slug}-jd.json
ai/{company}/{slug}-analysis.json
ai/{company}/{slug}-cover-letter.txt
ai/{company}/{slug}-apply.json
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

La compilación con `make -C latex build` manda los archivos auxiliares (`.aux`, `.fls`, `.log`, `.fdb_latexmk`, etc.) a `latex/build/` y copia solo el PDF final junto a los `.tex`. Si quieres borrar todo ese ruido, usa `make -C latex clean`.

Para generar resumes manualmente desde JSON, usa el generador TypeScript integrado en Node:

```sh
npm run resume -- --help
npm run resume -- --input ai/{company}/{slug}-application.json
```

No mezcles discovery con la generación de materiales: `build-resume` corre solo después de fit y application research para una oportunidad concreta.
