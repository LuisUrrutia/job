#!/usr/bin/env node

import { compileExistingTex, DEFAULT_TEMPLATE_PATH, generateResumeFromJson } from "./generator.ts";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CliArgs {
  input: string;
  template: string;
  output?: string;
  outputTex?: string;
  headline?: string;
  texOnly: boolean;
  compileTex?: string;
  help: boolean;
}

const DEFAULT_INPUT = "aurora-payments-senior-software-engineer-react-typescript.json";

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: DEFAULT_INPUT,
    template: DEFAULT_TEMPLATE_PATH,
    texOnly: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inlineValue] = arg.split("=", 2);

    switch (name) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--tex-only":
        args.texOnly = true;
        break;
      case "--input":
        if (inlineValue === undefined) {
          index += 1;
        }
        args.input = inlineValue ?? readValue(argv, index, name);
        break;
      case "--template":
        if (inlineValue === undefined) {
          index += 1;
        }
        args.template = inlineValue ?? readValue(argv, index, name);
        break;
      case "--output":
        if (inlineValue === undefined) {
          index += 1;
        }
        args.output = inlineValue ?? readValue(argv, index, name);
        break;
      case "--output-tex":
        if (inlineValue === undefined) {
          index += 1;
        }
        args.outputTex = inlineValue ?? readValue(argv, index, name);
        break;
      case "--headline":
        if (inlineValue === undefined) {
          index += 1;
        }
        args.headline = inlineValue ?? readValue(argv, index, name);
        break;
      case "--compile-tex":
        if (inlineValue === undefined) {
          index += 1;
        }
        args.compileTex = inlineValue ?? readValue(argv, index, name);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

export async function runResumeCli(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(helpText());
    return;
  }

  if (args.compileTex) {
    const result = await compileExistingTex({ texPath: args.compileTex, output: args.output });
    console.log(`Generated ${result.outputPdfPath} from ${args.compileTex}`);
    warnIfStillTooLong(result.compactModeApplied, result.pageCount);
    return;
  }

  const result = await generateResumeFromJson({
    input: args.input,
    template: args.template,
    output: args.output,
    outputTex: args.outputTex,
    headline: args.headline,
    texOnly: args.texOnly
  });

  console.log(`Generated ${args.texOnly ? result.outputTexPath : result.outputPdfPath} from ${args.input}`);
  warnIfStillTooLong(result.compactModeApplied, result.pageCount);
}

function readValue(argv: string[], index: number, optionName: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${optionName}.`);
  }

  return value;
}

function warnIfStillTooLong(compactModeApplied: boolean, pageCount: number | null): void {
  if (compactModeApplied && pageCount !== null && pageCount > 2) {
    console.log(`Warning: resume still exceeds 2 pages after compact spacing (${pageCount} pages).`);
  }
}

function helpText(): string {
  return `Generate a LaTeX resume from a JSON profile.

Usage:
  npm run resume -- [options]
  node src/resume/cli.ts [options]

Options:
  --input <path>       Path to the source JSON file.
  --template <path>    Path to the source LaTeX template.
  --output <path>      Path to the generated PDF output.
  --output-tex <path>  Optional path to write the generated LaTeX file.
  --headline <text>    Optional headline override.
  --tex-only           Write the generated LaTeX file without compiling a PDF.
  --compile-tex <path> Compile an existing LaTeX file to PDF instead of generating from JSON.
  --help               Show this help.
`;
}

function isMainModule(): boolean {
  return process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isMainModule()) {
  try {
    await runResumeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
