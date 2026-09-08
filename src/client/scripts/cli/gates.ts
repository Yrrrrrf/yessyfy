// gates.ts — Declarative quality gates for types, tests, and builds for GWA Client
import {
  badge,
  banner,
  colors,
  copySync,
  ensureDirSync,
  existsSync,
  join,
  parseSvelteCheck,
  parseTestStats,
  type ProcessResult,
  runSuite,
  Select,
  spawnStreamingProcess,
  type SuiteResult,
  walkSync,
} from "../../../cli/src/mod.ts";
import { generate404Html, generateHubHtml } from "./portal.ts";
import {
  type ClientPackage,
  discoverPackages,
  ensureNodeCompat,
  getAppTargets,
  getWorkspaceCategories,
} from "./workspace.ts";

export interface GateOptions {
  readonly verbose?: boolean;
  readonly parallel?: boolean;
  readonly bench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
  readonly all?: boolean;
}

function countSourceFiles(pkgPath: string): number {
  const srcDir = join(pkgPath, "src");
  if (!existsSync(srcDir)) return 0;
  let count = 0;
  try {
    for (const entry of walkSync(srcDir)) {
      if (entry.isFile) count++;
    }
  } catch {
    // Ignored
  }
  return count;
}

// ── TYPES GATE ─────────────────────────────────────────────────────────

export async function runTypesGate(
  options: GateOptions = {},
): Promise<SuiteResult<ClientPackage>> {
  ensureNodeCompat();

  return await runSuite<ClientPackage>({
    title: "TYPES",
    categories: getWorkspaceCategories(),
    cmdPreview:
      "deno run -A npm:svelte-check --tsconfig <tsconfig.json> --config <vite.config>",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    isBench: Boolean(options.bench),
    failFast: Boolean(options.failFast),
    filter: options.filter,
    resolver: (pkg) => {
      if (pkg.isSvelte) {
        const vcfg = existsSync(join(pkg.path, "vite.config.mts"))
          ? "./vite.config.mts"
          : existsSync(join(pkg.path, "vite.config.ts"))
          ? "./vite.config.ts"
          : "";

        const tsc = existsSync(join(pkg.path, "tsconfig.json"))
          ? "./tsconfig.json"
          : "../../config/tsconfig.json";

        const cfgFlags = vcfg
          ? ["--tsconfig", tsc, "--config", vcfg]
          : ["--tsconfig", tsc];

        const displayTsc = existsSync(join(pkg.path, "tsconfig.json"))
          ? `${pkg.path}/tsconfig.json`
          : "config/tsconfig.json";

        const displayVcfg = vcfg ? `${pkg.path}/${vcfg.replace("./", "")}` : "";
        const displayCmd = displayVcfg
          ? `deno run -A npm:svelte-check --tsconfig ${displayTsc} --config <${displayVcfg}>`
          : `deno run -A npm:svelte-check --tsconfig <${displayTsc}>`;

        const pre = pkg.isApp
          ? async () => {
            try {
              const syncCmd = new Deno.Command("deno", {
                args: [
                  "run",
                  "-A",
                  "npm:@sveltejs/kit@next/svelte-kit",
                  "sync",
                ],
                cwd: pkg.path,
                stdout: "null",
                stderr: "null",
              });
              await syncCmd.spawn().status;
            } catch {
              // Ignored
            }
          }
          : undefined;

        return {
          engine: "svelte-check",
          cwd: pkg.path,
          cmd: ["deno", "run", "-A", "npm:svelte-check@^4.7.5", ...cfgFlags],
          displayCmd,
          pre,
        };
      }

      return {
        engine: "deno",
        cwd: pkg.path,
        cmd: ["deno", "check", "src/mod.ts"],
        displayCmd: `deno check <${pkg.path}/src/mod.ts>`,
      };
    },
    evaluator: (res: ProcessResult, pkg: ClientPackage) => {
      const stats = parseSvelteCheck(res.combined, res.exitCode);
      const filesCount = countSourceFiles(pkg.path);

      return {
        badge: badge(
          filesCount,
          "files",
          stats.errCount,
          "errors",
          stats.warnCount,
          "warnings",
        ),
        isErr: stats.isErr,
        errCount: stats.errCount,
      };
    },
    successMsg: "✓ 0 type errors across all workspaces",
    failMsg: (errs) => `✗ ${errs} type checking errors found`,
  });
}

// ── TEST GATE ──────────────────────────────────────────────────────────

export async function runTestsGate(
  options: GateOptions = {},
): Promise<SuiteResult<ClientPackage>> {
  return await runSuite<ClientPackage>({
    title: "TEST",
    categories: getWorkspaceCategories(),
    cmdPreview:
      "deno run -A npm:vitest run --config ./config/vitest.config.ts --project <sdk/*>",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    isBench: Boolean(options.bench),
    failFast: Boolean(options.failFast),
    filter: options.filter,
    resolver: (pkg) => {
      const engine = pkg.isSvelte ? "vitest" : "deno";
      if (!pkg.hasTests) {
        return {
          engine,
          skip: "no tests",
          badge: badge(0, "passed", 0, "failed", 0, "skipped"),
        };
      }

      if (pkg.isSvelte) {
        return {
          engine: "vitest",
          cwd: "",
          cmd: [
            "deno",
            "run",
            "-A",
            "npm:vitest",
            "run",
            "--config",
            "./config/vitest.config.ts",
            "--project",
            pkg.name,
          ],
          displayCmd:
            `deno run -A npm:vitest run --config ./config/vitest.config.ts --project <${pkg.name}>`,
        };
      }

      return {
        engine: "deno",
        cwd: "",
        cmd: ["deno", "test", "--allow-all", pkg.path],
        displayCmd: `deno test --allow-all <${pkg.path}>`,
      };
    },
    evaluator: (res: ProcessResult) => {
      const stats = parseTestStats(res.combined, res.exitCode);
      return {
        badge: badge(
          stats.passed,
          "passed",
          stats.failed,
          "failed",
          stats.skipped,
          "skipped",
        ),
        isErr: stats.isErr,
        errCount: stats.failed,
      };
    },
    successMsg: "✓ All test suites passed cleanly",
    failMsg: (errs) => `✗ ${errs} test suites failed`,
  });
}

// ── BUILD GATE ─────────────────────────────────────────────────────────

export async function runBuildGate(
  options: GateOptions = {},
  targetApp?: string,
): Promise<SuiteResult<ClientPackage>> {
  const isAll = Boolean(options.all || targetApp === "all" || !targetApp);
  const targets = isAll ? getAppTargets() : getAppTargets(targetApp);
  if (targets.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    Deno.exit(1);
  }

  return await runSuite<ClientPackage>({
    title: "BUILDING",
    categories: [{ name: "APP", targets }],
    cmdPreview: "cd <apps/*> ;; deno run -A npm:vite build",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    resolver: (pkg) => ({
      engine: "vite build",
      cwd: pkg.path,
      pre: async () => {
        try {
          await Deno.remove(join(pkg.path, "build"), { recursive: true });
        } catch {
          // Ignored
        }
        try {
          const syncCmd = new Deno.Command("deno", {
            args: ["run", "-A", "npm:@sveltejs/kit@next/svelte-kit", "sync"],
            cwd: pkg.path,
            stdout: "null",
            stderr: "null",
          });
          await syncCmd.spawn().status;
        } catch {
          // Ignored
        }
      },
      cmd: ["deno", "run", "-A", "npm:vite", "build"],
      displayCmd: `cd <${pkg.path}> ;; deno run -A npm:vite build`,
    }),
    evaluator: (res: ProcessResult) => {
      const isOk = res.exitCode === 0;
      return {
        badge: isOk ? colors.green("✓ success") : colors.bold.red("✗ failed"),
        isErr: !isOk,
        errCount: isOk ? 0 : 1,
      };
    },
    successMsg: "✓ All applications built successfully",
    failMsg: (errs) => `✗ ${errs} build failed`,
  });
}

const APP_TAG_COLORS: ((s: string) => string)[] = [
  colors.bold.cyan,
  colors.bold.magenta,
  colors.bold.green,
  colors.bold.yellow,
  colors.bold.blue,
];

function getAppTagColor(index: number): (s: string) => string {
  return APP_TAG_COLORS[index % APP_TAG_COLORS.length]!;
}

// ── DEV SERVER ─────────────────────────────────────────────────────────

export async function runDev(
  targetApp?: string,
  extraArgs: string[] = [],
  options: GateOptions = {},
): Promise<void> {
  const apps = discoverPackages("apps");
  if (apps.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    return;
  }

  const isAll = Boolean(options.all || targetApp === "all");

  const abortController = new AbortController();
  const handleSigint = () => {
    abortController.abort();
  };
  try {
    Deno.addSignalListener("SIGINT", handleSigint);
  } catch {
    // Ignored
  }

  if (isAll) {
    console.log(
      banner(
        `🚀 Starting dev servers for all apps (${
          apps.map((a) => a.name).join(", ")
        })`,
        "magenta",
      ),
    );
    console.log("");

    const tasks = apps.map((app, index) => {
      const colorFn = getAppTagColor(index);
      const tag = colorFn(`[${app.name}]`);
      return spawnStreamingProcess({
        cmd: ["deno", "run", "-A", "npm:vite", "dev", "--host", ...extraArgs],
        cwd: app.path,
        env: {
          FORCE_COLOR: "1",
          CLICOLOR_FORCE: "1",
        },
        signal: abortController.signal,
        onLine: (line, type) => {
          if (type === "stderr") {
            console.error(`${tag} ${line}`);
          } else {
            console.log(`${tag} ${line}`);
          }
        },
      });
    });

    const results = await Promise.all(tasks);
    const anyFailed = results.some((r) => r.exitCode !== 0);
    if (anyFailed && !abortController.signal.aborted) {
      Deno.exit(1);
    }
    return;
  }

  let selectedApp = targetApp?.replace(/^apps\//, "");
  if (!selectedApp) {
    if (apps.length === 1) {
      selectedApp = apps[0].name;
    } else {
      console.log("");
      selectedApp = await Select.prompt({
        message: "Select app to run",
        options: apps.map((a) => ({ name: a.name, value: a.name })),
      });
    }
  }

  const appIndex = apps.findIndex((a) => a.name === selectedApp);
  const colorFn = getAppTagColor(appIndex >= 0 ? appIndex : 0);
  const appPath = `apps/${selectedApp}`;
  if (!existsSync(appPath)) {
    console.error(colors.red(`Application not found: ${appPath}`));
    Deno.exit(1);
  }

  console.log(banner(`🚀 Starting dev server: ${appPath}`, "magenta"));
  console.log("");

  const tag = colorFn(`[${selectedApp}]`);

  const res = await spawnStreamingProcess({
    cmd: ["deno", "run", "-A", "npm:vite", "dev", "--host", ...extraArgs],
    cwd: appPath,
    env: {
      FORCE_COLOR: "1",
      CLICOLOR_FORCE: "1",
    },
    signal: abortController.signal,
    onLine: (line, type) => {
      if (type === "stderr") {
        console.error(`${tag} ${line}`);
      } else {
        console.log(`${tag} ${line}`);
      }
    },
  });
  if (res.exitCode !== 0 && !abortController.signal.aborted) {
    Deno.exit(res.exitCode);
  }
}

// ── PREVIEW SERVER ─────────────────────────────────────────────────────

export async function runPreview(
  targetApp?: string,
  options: GateOptions = {},
): Promise<void> {
  const apps = discoverPackages("apps");
  if (apps.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    return;
  }

  const isAll = Boolean(options.all || targetApp === "all");

  const abortController = new AbortController();
  const handleSigint = () => {
    abortController.abort();
  };
  try {
    Deno.addSignalListener("SIGINT", handleSigint);
  } catch {
    // Ignored
  }

  if (isAll) {
    const buildResult = await runBuildGate(options);
    if (!buildResult.success) Deno.exit(1);

    console.log("");
    console.log(
      banner(
        `🎪 Previewing production builds for all apps (${
          apps.map((a) => a.name).join(", ")
        })`,
        "magenta",
      ),
    );
    console.log("");

    const tasks = apps.map((app, index) => {
      const colorFn = getAppTagColor(index);
      const tag = colorFn(`[${app.name}]`);
      return spawnStreamingProcess({
        cmd: ["deno", "run", "-A", "npm:vite", "preview"],
        cwd: app.path,
        env: {
          FORCE_COLOR: "1",
          CLICOLOR_FORCE: "1",
        },
        signal: abortController.signal,
        onLine: (line, type) => {
          if (type === "stderr") {
            console.error(`${tag} ${line}`);
          } else {
            console.log(`${tag} ${line}`);
          }
        },
      });
    });

    const results = await Promise.all(tasks);
    const anyFailed = results.some((r) => r.exitCode !== 0);
    if (anyFailed && !abortController.signal.aborted) {
      Deno.exit(1);
    }
    return;
  }

  let selectedApp = targetApp?.replace(/^apps\//, "");

  if (selectedApp) {
    // Specific app targeted
    const appPath = `apps/${selectedApp}`;
    if (!existsSync(appPath)) {
      console.error(colors.red(`Application not found: ${appPath}`));
      Deno.exit(1);
    }
    const buildResult = await runBuildGate(options, selectedApp);
    if (!buildResult.success) Deno.exit(1);
  } else {
    // No specific app targeted: build all apps first ("create them and then let me select")
    const buildResult = await runBuildGate(options);
    if (!buildResult.success) Deno.exit(1);

    if (apps.length === 1) {
      selectedApp = apps[0].name;
    } else {
      console.log("");
      selectedApp = await Select.prompt({
        message: "Select app to preview",
        options: apps.map((a) => ({ name: a.name, value: a.name })),
      });
    }
  }

  const appIndex = apps.findIndex((a) => a.name === selectedApp);
  const colorFn = getAppTagColor(appIndex >= 0 ? appIndex : 0);
  const appPath = `apps/${selectedApp}`;
  console.log("");
  console.log(banner(`🎪 Previewing production build: ${appPath}`, "magenta"));
  console.log("");

  const tag = colorFn(`[${selectedApp}]`);

  const res = await spawnStreamingProcess({
    cmd: ["deno", "run", "-A", "npm:vite", "preview"],
    cwd: appPath,
    env: {
      FORCE_COLOR: "1",
      CLICOLOR_FORCE: "1",
    },
    signal: abortController.signal,
    onLine: (line, type) => {
      if (type === "stderr") {
        console.error(`${tag} ${line}`);
      } else {
        console.log(`${tag} ${line}`);
      }
    },
  });
  if (res.exitCode !== 0 && !abortController.signal.aborted) {
    Deno.exit(res.exitCode);
  }
}

// ── GITHUB PAGES DEPLOY GATE ──────────────────────────────────────────

export interface PagesGateOptions extends GateOptions {
  readonly repo?: string;
  readonly push?: boolean;
}

export async function runPagesGate(
  options: PagesGateOptions = {},
): Promise<SuiteResult<ClientPackage>> {
  const repo = options.repo ?? "yessyfy";
  const shouldPush = options.push !== false;
  const targets = getAppTargets();

  if (targets.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    Deno.exit(1);
  }

  const buildResult = await runSuite<ClientPackage>({
    title: "GITHUB PAGES BUILD",
    categories: [{ name: "APP (PAGES)", targets }],
    cmdPreview: `BASE_PATH=/${repo}/<app> deno run -A npm:vite build`,
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    resolver: (pkg) => ({
      engine: "vite build",
      cwd: pkg.path,
      env: {
        BASE_PATH: `/${repo}/${pkg.name}`,
      },
      pre: async () => {
        try {
          await Deno.remove(join(pkg.path, "build"), { recursive: true });
        } catch {
          // Ignored
        }
        try {
          const syncCmd = new Deno.Command("deno", {
            args: ["run", "-A", "npm:@sveltejs/kit@next/svelte-kit", "sync"],
            cwd: pkg.path,
            stdout: "null",
            stderr: "null",
          });
          await syncCmd.spawn().status;
        } catch {
          // Ignored
        }
      },
      cmd: ["deno", "run", "-A", "npm:vite", "build"],
      displayCmd:
        `cd <${pkg.path}> ;; BASE_PATH=/${repo}/${pkg.name} deno run -A npm:vite build`,
    }),
    evaluator: (res: ProcessResult) => {
      const isOk = res.exitCode === 0;
      return {
        badge: isOk ? colors.green("✓ success") : colors.bold.red("✗ failed"),
        isErr: !isOk,
        errCount: isOk ? 0 : 1,
      };
    },
    successMsg:
      `✓ All ${targets.length} applications built for GitHub Pages (base: /${repo}/*)`,
    failMsg: (errs) => `✗ ${errs} application builds failed`,
  });

  if (!buildResult.success) {
    return buildResult;
  }

  // ── ASSEMBLE PAGES DIST DIRECTORY ─────────────────────────
  console.log(
    colors.bold.cyan("\n📦 Packaging GitHub Pages deployment bundle..."),
  );

  // Staging in root /build/gh-pages
  const rootDir = join(Deno.cwd(), "../..");
  const stagingDir = join(rootDir, "build/gh-pages");
  try {
    await Deno.remove(stagingDir, { recursive: true });
  } catch {
    // Ignored
  }
  ensureDirSync(stagingDir);

  // 1. Copy each app build to staging
  for (const target of targets) {
    const appBuildDir = join(Deno.cwd(), target.path, "build");
    const destDir = join(stagingDir, target.name);
    if (!existsSync(appBuildDir)) {
      console.error(
        colors.red(`Error: Build directory not found: ${appBuildDir}`),
      );
      Deno.exit(1);
    }
    copySync(appBuildDir, destDir, { overwrite: true });

    // Fallback 404 for SvelteKit client-side routing within the app
    const indexPath = join(destDir, "index.html");
    const fallbackPath = join(destDir, "404.html");
    if (existsSync(indexPath) && !existsSync(fallbackPath)) {
      copySync(indexPath, fallbackPath);
    }
    console.log(
      `  ${colors.green("✓")} ${
        colors.bold(target.name)
      } SPA staged -> ${destDir}`,
    );
  }

  // 2. Add .nojekyll to prevent Jekyll from skipping _app directory
  await Deno.writeTextFile(join(stagingDir, ".nojekyll"), "");
  console.log(`  ${colors.green("✓")} .nojekyll marker written`);

  // 3. Get commit SHA
  let commitSha = "latest";
  try {
    const gitRevCmd = new Deno.Command("git", {
      args: ["rev-parse", "--short", "HEAD"],
      cwd: rootDir,
      stdout: "piped",
      stderr: "null",
    });
    const out = await gitRevCmd.output();
    if (out.success) {
      commitSha = new TextDecoder().decode(out.stdout).trim();
    }
  } catch {
    // Ignored
  }

  // 4. Generate Hub portal index.html and root 404.html
  const hubHtml = generateHubHtml({
    repoName: repo,
    commitSha,
    timestamp: new Date().toISOString(),
  });
  await Deno.writeTextFile(join(stagingDir, "index.html"), hubHtml);
  console.log(
    `  ${colors.green("✓")} Multi-App Hub Portal generated -> index.html`,
  );

  const root404Html = generate404Html(repo);
  await Deno.writeTextFile(join(stagingDir, "404.html"), root404Html);
  console.log(
    `  ${colors.green("✓")} SPA routing fallback router generated -> 404.html`,
  );

  // ── PUSH TO GITHUB PAGES ──────────────────────────────────
  if (shouldPush) {
    console.log(
      colors.bold.magenta("\n🚀 Pushing to GitHub (branch: gh-pages)..."),
    );

    // Find git remote URL from root repo
    let remoteUrl = "";
    try {
      const gitRemoteCmd = new Deno.Command("git", {
        args: ["remote", "get-url", "origin"],
        cwd: rootDir,
        stdout: "piped",
        stderr: "null",
      });
      const out = await gitRemoteCmd.output();
      if (out.success) {
        remoteUrl = new TextDecoder().decode(out.stdout).trim();
      }
    } catch {
      // Ignored
    }

    if (!remoteUrl) {
      console.error(
        colors.red("Error: Git remote 'origin' not configured. Push aborted."),
      );
      Deno.exit(1);
    }

    // Git deploy using temporary repo in stagingDir
    const runGit = async (args: string[]) => {
      const cmd = new Deno.Command("git", {
        args,
        cwd: stagingDir,
        stdout: "inherit",
        stderr: "inherit",
      });
      const status = await cmd.spawn().status;
      if (!status.success) {
        throw new Error(`Git command failed: git ${args.join(" ")}`);
      }
    };

    try {
      await runGit(["init", "-b", "gh-pages"]);
      await runGit(["add", "-A"]);
      await runGit([
        "commit",
        "-m",
        `deploy(pages): publish 3 SPAs (web, colab, vision) at ${commitSha} [skip ci]`,
      ]);
      await runGit(["remote", "add", "origin", remoteUrl]);
      await runGit(["push", "-f", "origin", "gh-pages"]);
      console.log(
        colors.bold.green("✓ Successfully pushed gh-pages branch to origin!"),
      );

      // Ensure GitHub Pages is enabled on the repository
      try {
        const ghPagesCheck = new Deno.Command("gh", {
          args: ["api", `repos/Yrrrrrf/${repo}/pages`],
          stdout: "null",
          stderr: "null",
        });
        const checkStatus = await ghPagesCheck.spawn().status;
        if (!checkStatus.success) {
          console.log(colors.cyan("Enabling GitHub Pages on repository..."));
          const ghPagesEnable = new Deno.Command("gh", {
            args: [
              "api",
              "--method",
              "POST",
              `repos/Yrrrrrf/${repo}/pages`,
              "-f",
              "source[branch]=gh-pages",
              "-f",
              "source[path]=/",
            ],
            stdout: "null",
            stderr: "null",
          });
          await ghPagesEnable.spawn().status;
        }
      } catch {
        // Ignored
      }

      console.log(
        banner(
          `🎉 GitHub Pages Live:\n` +
            `  • Hub Portal: https://yrrrrrf.github.io/${repo}/\n` +
            `  • Cliente Web: https://yrrrrrf.github.io/${repo}/web/\n` +
            `  • Colab Field: https://yrrrrrf.github.io/${repo}/colab/\n` +
            `  • Vision CRM: https://yrrrrrf.github.io/${repo}/vision/`,
          "green",
        ),
      );
    } catch (err) {
      console.error(colors.red(`Failed to push to gh-pages: ${err}`));
      Deno.exit(1);
    }
  }

  return buildResult;
}
