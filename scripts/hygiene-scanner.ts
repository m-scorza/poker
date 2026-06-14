import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = process.cwd();
const SRC_DIR = path.join(REPO_ROOT, 'src');

interface ExportInfo {
  name: string;
  kind: string; // 'function' | 'class' | 'interface' | 'type' | 'variable' | 'enum' | 'default' | 'reexport'
  line: number;
}

interface ImportInfo {
  localName: string;
  importedName: string; // name in target file, or 'default' or '*'
  moduleSpecifier: string;
  targetFile: string | null; // resolved absolute path
  isTypeOnly: boolean;
  line: number;
}

interface FileAnalysis {
  filePath: string;
  relativeName: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  localDeclarations: { name: string; kind: string; line: number; isExported: boolean }[];
  usedIdentifiers: Set<string>;
  unreachableCode: { line: number; message: string }[];
  workarounds: { line: number; type: string; details: string }[];
  ast: ts.SourceFile;
}

type ReportRow = Record<string, unknown>;

interface CircularReportEntry {
  path: string;
  length: number;
}

// 1. Recursive file finder
function getFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else if (/\.(ts|tsx)$/.test(file)) {
      results.push(filePath);
    }
  }
  return results;
}

// 2. Resolve import paths using tsconfig-like resolution
function resolveImportPath(sourceFile: string, importPath: string): string | null {
  if (importPath.startsWith('@/')) {
    const rel = importPath.slice(2);
    const abs = path.join(SRC_DIR, rel);
    return findFileWithExt(abs);
  }
  if (importPath.startsWith('.')) {
    const abs = path.resolve(path.dirname(sourceFile), importPath);
    return findFileWithExt(abs);
  }
  return null; // External library
}

function findFileWithExt(basePath: string): string | null {
  const exts = ['.ts', '.tsx', '.d.ts'];
  for (const ext of exts) {
    const file = basePath + ext;
    if (fs.existsSync(file)) return file;
  }
  // Check if directory with index
  for (const ext of exts) {
    const file = path.join(basePath, 'index' + ext);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

// Helper to get line number from character position
function getLineNumber(sourceFile: ts.SourceFile, pos: number): number {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

// Parse AST of a file and analyze
function analyzeFile(filePath: string): FileAnalysis {
  const code = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const relativeName = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');

  const exports: ExportInfo[] = [];
  const imports: ImportInfo[] = [];
  const localDeclarations: { name: string; kind: string; line: number; isExported: boolean }[] = [];
  const usedIdentifiers = new Set<string>();
  const unreachableCode: { line: number; message: string }[] = [];
  const workarounds: { line: number; type: string; details: string }[] = [];

  // Check for commented-out code or eslint-disable comments in text
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (line.includes('eslint-disable')) {
      workarounds.push({
        line: lineNum,
        type: 'eslint-disable',
        details: line.trim()
      });
    }
    // Simple regex for commented out code
    if (line.trim().startsWith('//') && (
      line.includes('const ') ||
      line.includes('let ') ||
      line.includes('function ') ||
      line.includes('import ') ||
      line.includes('console.log(') ||
      line.includes('return ')
    ) && !line.includes('eslint-disable') && !line.includes('TODO')) {
      workarounds.push({
        line: lineNum,
        type: 'commented-out-code',
        details: line.trim()
      });
    }
    
    // Magic constants in financial/poker math without comments
    if ((filePath.includes('analysis') || filePath.includes('parser')) && !filePath.includes('test')) {
      const match = line.match(/\b(0\.\d+|[1-9]\d{2,})\b/g);
      if (match) {
        for (const num of match) {
          const val = parseFloat(num);
          // Highlight arbitrary poker numbers like 100, 1000, 0.4, 0.5 without comments
          if (val !== 0 && val !== 1 && val !== 2 && val !== 100 && !line.includes('//') && !line.includes('/*')) {
            // Only flag if it's a magic looking number
            if ((val > 2 && val < 100 && val !== 10 && val !== 50) || val > 1000) {
              workarounds.push({
                line: lineNum,
                type: 'magic-constant',
                details: `Magic number ${num} without explanatory comment: "${line.trim()}"`
              });
            }
          }
        }
      }
    }
  });

  function walk(node: ts.Node) {
    // Collect all identifiers used in the file (to check unused imports/locals)
    if (ts.isIdentifier(node)) {
      // Avoid counting the identifier if it is the declaration name itself
      let isDeclaration = false;
      const parent = node.parent;
      if (parent) {
        if (ts.isImportSpecifier(parent) && parent.name === node) isDeclaration = true;
        if (ts.isImportClause(parent) && parent.name === node) isDeclaration = true;
        if (ts.isNamespaceImport(parent) && parent.name === node) isDeclaration = true;
        if (ts.isVariableDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isFunctionDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isClassDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isInterfaceDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isTypeAliasDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isEnumDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isEnumMember(parent) && parent.name === node) isDeclaration = true;
        if (ts.isParameter(parent) && parent.name === node) isDeclaration = true;
        if (ts.isPropertyDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isMethodDeclaration(parent) && parent.name === node) isDeclaration = true;
        if (ts.isPropertyAssignment(parent) && parent.name === node) isDeclaration = true;
      }
      if (!isDeclaration) {
        usedIdentifiers.add(node.text);
      }
    }

    // 1. Analyze Imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const targetFile = resolveImportPath(filePath, moduleSpecifier);
      const isTypeOnly = !!node.importClause?.isTypeOnly;
      const line = getLineNumber(sourceFile, node.getStart());

      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          imports.push({
            localName: node.importClause.name.text,
            importedName: 'default',
            moduleSpecifier,
            targetFile,
            isTypeOnly,
            line
          });
        }
        // Named/Namespace imports
        if (node.importClause.namedBindings) {
          const bindings = node.importClause.namedBindings;
          if (ts.isNamespaceImport(bindings)) {
            imports.push({
              localName: bindings.name.text,
              importedName: '*',
              moduleSpecifier,
              targetFile,
              isTypeOnly,
              line
            });
          } else if (ts.isNamedImports(bindings)) {
            for (const elem of bindings.elements) {
              imports.push({
                localName: elem.name.text,
                importedName: elem.propertyName ? elem.propertyName.text : elem.name.text,
                moduleSpecifier,
                targetFile,
                isTypeOnly: isTypeOnly || elem.isTypeOnly,
                line
              });
            }
          }
        }
      }
    }

    // 2. Analyze Dynamic Imports
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const firstArg = node.arguments[0];
      if (firstArg && ts.isStringLiteral(firstArg)) {
        const moduleSpecifier = firstArg.text;
        const targetFile = resolveImportPath(filePath, moduleSpecifier);
        const line = getLineNumber(sourceFile, node.getStart());
        imports.push({
          localName: '*',
          importedName: '*',
          moduleSpecifier,
          targetFile,
          isTypeOnly: false,
          line
        });
      }
    }

    // 3. Analyze Exports
    const hasExportModifier = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    const hasDefaultModifier = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

    if (hasExportModifier) {
      const line = getLineNumber(sourceFile, node.getStart());
      if (ts.isFunctionDeclaration(node) && node.name) {
        exports.push({ name: hasDefaultModifier ? 'default' : node.name.text, kind: 'function', line });
      } else if (ts.isClassDeclaration(node) && node.name) {
        exports.push({ name: hasDefaultModifier ? 'default' : node.name.text, kind: 'class', line });
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        exports.push({ name: node.name.text, kind: 'interface', line });
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        exports.push({ name: node.name.text, kind: 'type', line });
      } else if (ts.isEnumDeclaration(node) && node.name) {
        exports.push({ name: node.name.text, kind: 'enum', line });
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push({ name: decl.name.text, kind: 'variable', line });
          } else {
            // Destructuring export like export const { A, B } = ...
            const extractNames = (n: ts.Node) => {
              if (ts.isBindingElement(n) && ts.isIdentifier(n.name)) {
                exports.push({ name: n.name.text, kind: 'variable', line });
              }
              n.forEachChild(extractNames);
            };
            decl.name.forEachChild(extractNames);
          }
        }
      }
    } else if (hasDefaultModifier) {
      const line = getLineNumber(sourceFile, node.getStart());
      exports.push({ name: 'default', kind: 'default', line });
    }

    // Export declarations like export { A, B as C }
    if (ts.isExportDeclaration(node)) {
      const line = getLineNumber(sourceFile, node.getStart());
      if (node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          for (const elem of node.exportClause.elements) {
            exports.push({
              name: elem.name.text,
              kind: node.moduleSpecifier ? 'reexport' : 'variable',
              line
            });
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
              imports.push({
                localName: elem.propertyName ? elem.propertyName.text : elem.name.text,
                importedName: elem.propertyName ? elem.propertyName.text : elem.name.text,
                moduleSpecifier: node.moduleSpecifier.text,
                targetFile: resolveImportPath(filePath, node.moduleSpecifier.text),
                isTypeOnly: false,
                line
              });
            }
          }
        }
      } else if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        // export * from 'module'
        exports.push({ name: '*', kind: 'reexport', line });
        imports.push({
          localName: '*',
          importedName: '*',
          moduleSpecifier: node.moduleSpecifier.text,
          targetFile: resolveImportPath(filePath, node.moduleSpecifier.text),
          isTypeOnly: false,
          line
        });
      }
    }

    // `export default <expression>` (e.g. `export default App;`). This is an
    // ExportAssignment, not a declaration with export+default modifiers, so it
    // is recorded here — otherwise default imports of it look like they point at
    // a module with no default export.
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      exports.push({ name: 'default', kind: 'default', line: getLineNumber(sourceFile, node.getStart()) });
    }

    // 4. Collect local declarations
    const isDecl = ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node);
    if (isDecl) {
      const parent = node.parent;
      // We only care about file-level (top-level) declarations to find unused locals, or function-level.
      // Let's filter to declarations direct inside source file or block
      const isTopLevel = parent && (ts.isSourceFile(parent) || (ts.isVariableDeclarationList(parent) && ts.isVariableStatement(parent.parent) && ts.isSourceFile(parent.parent.parent)));
      if (isTopLevel) {
        let name = '';
        let kind = '';
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
          name = node.name.text;
          kind = 'variable';
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          name = node.name.text;
          kind = 'function';
        } else if (ts.isClassDeclaration(node) && node.name) {
          name = node.name.text;
          kind = 'class';
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
          name = node.name.text;
          kind = 'interface';
        } else if (ts.isTypeAliasDeclaration(node) && node.name) {
          name = node.name.text;
          kind = 'type';
        } else if (ts.isEnumDeclaration(node) && node.name) {
          name = node.name.text;
          kind = 'enum';
        }

        if (name) {
          // Check if this top level node is exported
          let isExported = false;
          let curr: ts.Node = node;
          if (ts.isVariableDeclaration(node)) {
            curr = parent.parent; // VariableStatement
          }
          isExported = curr.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
          localDeclarations.push({
            name,
            kind,
            line: getLineNumber(sourceFile, node.getStart()),
            isExported
          });
        }
      }
    }

    // 5. Unreachable code detection
    if (ts.isBlock(node)) {
      let earlyTerminator: ts.Node | null = null;
      for (let i = 0; i < node.statements.length; i++) {
        const stmt = node.statements[i]!;
        if (earlyTerminator) {
          unreachableCode.push({
            line: getLineNumber(sourceFile, stmt.getStart()),
            message: `Unreachable statement after early ${earlyTerminator.constructor.name.replace('NodeObject', '')} on line ${getLineNumber(sourceFile, earlyTerminator.getStart())}`
          });
        } else if (ts.isReturnStatement(stmt) || ts.isThrowStatement(stmt) || ts.isBreakStatement(stmt) || ts.isContinueStatement(stmt)) {
          // Only flag if it's not the last statement in the block
          if (i < node.statements.length - 1) {
            earlyTerminator = stmt;
          }
        }
      }
    }

    // 6. Empty catch block
    if (ts.isCatchClause(node)) {
      if (node.block.statements.length === 0) {
        workarounds.push({
          line: getLineNumber(sourceFile, node.getStart()),
          type: 'empty-catch',
          details: 'Empty catch block: catches error but does absolutely nothing.'
        });
      }
    }

    node.forEachChild(walk);
  }

  walk(sourceFile);

  return {
    filePath,
    relativeName,
    exports,
    imports,
    localDeclarations,
    usedIdentifiers,
    unreachableCode,
    workarounds,
    ast: sourceFile
  };
}

// 3. Main analysis flow
function run() {
  console.log('Scanning all files in src/ ...');
  const files = getFiles(SRC_DIR);
  console.log(`Found ${files.length} files. Parsing...`);

  const fileMap = new Map<string, FileAnalysis>();
  for (const f of files) {
    fileMap.set(f, analyzeFile(f));
  }

  console.log('Resolving import/export matches...');

  // Maps to record references
  // targetFile -> exportName -> Set of files importing it
  const exportUsage = new Map<string, Map<string, Set<string>>>();
  // Initialize exportUsage map
  for (const [f, analysis] of fileMap.entries()) {
    const fileExports = new Map<string, Set<string>>();
    for (const exp of analysis.exports) {
      fileExports.set(exp.name, new Set<string>());
    }
    exportUsage.set(f, fileExports);
  }

  // Populate exportUsage from imports
  for (const [importingFile, analysis] of fileMap.entries()) {
    for (const imp of analysis.imports) {
      if (imp.targetFile && exportUsage.has(imp.targetFile)) {
        const fileExports = exportUsage.get(imp.targetFile)!;
        if (imp.importedName === '*') {
          // Namespace import: consider ALL exports of targetFile as imported by this file
          for (const [expName, set] of fileExports.entries()) {
            set.add(importingFile);
          }
        } else {
          if (!fileExports.has(imp.importedName)) {
            fileExports.set(imp.importedName, new Set());
          }
          fileExports.get(imp.importedName)!.add(importingFile);
        }
      }
    }
  }

  // ----------------------------------------------------
  // (a) Unused exports
  // ----------------------------------------------------
  const unusedExportsReport: ReportRow[] = [];
  for (const [f, analysis] of fileMap.entries()) {
    const fileExports = exportUsage.get(f)!;
    for (const exp of analysis.exports) {
      if (exp.name === '*') continue; // export * re-exports are skipped or handled dynamically
      const importers = fileExports.get(exp.name) || new Set();
      
      // Let's filter out if the file itself is just exporting but no other file imports it
      const externalImporters = Array.from(importers).filter(impFile => impFile !== f);
      
      const onlyImportedInTests = externalImporters.length > 0 && externalImporters.every(impFile => impFile.includes('__tests__') || impFile.includes('.test.'));
      const notImportedAtAll = externalImporters.length === 0;

      if (notImportedAtAll || onlyImportedInTests) {
        // Check if it's the main entry point or a dynamically loaded Page
        const isPage = analysis.relativeName.startsWith('src/pages/') && exp.name === path.basename(f, path.extname(f));
        const isEntry = analysis.relativeName === 'src/main.tsx' || analysis.relativeName === 'src/App.tsx';
        
        if (!isPage && !isEntry) {
          // Distinguish a genuinely dead export from one that is still called
          // within its own file (only the `export` keyword is redundant). Without
          // this, a "dead code" sweep that trusts `unused_completely` would delete
          // live code.
          const usedInOwnFile = exp.name !== 'default' && analysis.usedIdentifiers.has(exp.name);
          const type = onlyImportedInTests
            ? 'imported_only_in_tests'
            : usedInOwnFile
              ? 'unused_export_used_locally'
              : 'unused_completely';
          unusedExportsReport.push({
            filePath: analysis.relativeName,
            line: exp.line,
            name: exp.name,
            kind: exp.kind,
            type,
            importers: externalImporters.map(imp => path.relative(REPO_ROOT, imp).replace(/\\/g, '/'))
          });
        }
      }
    }
  }

  // ----------------------------------------------------
  // (b) Unused local declarations
  // ----------------------------------------------------
  const unusedLocalsReport: ReportRow[] = [];
  for (const [f, analysis] of fileMap.entries()) {
    // Only check local declarations that are NOT exported
    for (const decl of analysis.localDeclarations) {
      if (!decl.isExported) {
        // If it's a test file, it's not checked by TSC, so check here
        // If the identifier name is not in the set of usedIdentifiers in this file, it's unused!
        if (!analysis.usedIdentifiers.has(decl.name)) {
          // Let's exclude standard things or check
          unusedLocalsReport.push({
            filePath: analysis.relativeName,
            line: decl.line,
            name: decl.name,
            kind: decl.kind
          });
        }
      }
    }
  }

  // ----------------------------------------------------
  // (c) Unused imports
  // ----------------------------------------------------
  const unusedImportsReport: ReportRow[] = [];
  for (const [f, analysis] of fileMap.entries()) {
    for (const imp of analysis.imports) {
      if (imp.localName === '*') continue; // skip namespace imports for simplicity, or we can check if the namespace identifier is used
      
      // If the local imported name is not in usedIdentifiers of the file, it's unused!
      if (!analysis.usedIdentifiers.has(imp.localName)) {
        // Note: Sometimes types are used in TS but might be excluded or we didn't track perfectly.
        // Let's double check by doing a simple check. If they are not used as identifiers, they are unused.
        unusedImportsReport.push({
          filePath: analysis.relativeName,
          line: imp.line,
          name: imp.localName,
          module: imp.moduleSpecifier
        });
      }
    }
  }

  // ----------------------------------------------------
  // (d) Wrong imports
  // ----------------------------------------------------
  const wrongImportsReport: ReportRow[] = [];
  
  // (d.1) Default imported as named or named imported as default
  for (const [f, analysis] of fileMap.entries()) {
    for (const imp of analysis.imports) {
      if (imp.targetFile && fileMap.has(imp.targetFile)) {
        const targetAnalysis = fileMap.get(imp.targetFile)!;
        const targetExports = targetAnalysis.exports.map(e => e.name);

        if (imp.importedName === 'default') {
          // It's a default import. Check if target actually has a default export!
          const hasDefault = targetExports.includes('default');
          if (!hasDefault) {
            wrongImportsReport.push({
              filePath: analysis.relativeName,
              line: imp.line,
              type: 'default_imported_but_no_default_export',
              details: `Imported default from "${imp.moduleSpecifier}", but it has no default export. Available exports: ${targetExports.join(', ')}`
            });
          }
        } else if (imp.importedName !== '*' && imp.importedName !== 'default') {
          // It's a named import. Check if target has this named export!
          const hasNamed = targetExports.includes(imp.importedName);
          if (!hasNamed) {
            // Check if target only has default export
            const hasDefault = targetExports.includes('default');
            if (hasDefault && targetExports.length === 1) {
              wrongImportsReport.push({
                filePath: analysis.relativeName,
                line: imp.line,
                type: 'named_imported_but_only_default_export',
                details: `Imported { ${imp.importedName} } from "${imp.moduleSpecifier}", but it only exports default.`
              });
            } else {
              wrongImportsReport.push({
                filePath: analysis.relativeName,
                line: imp.line,
                type: 'named_export_missing',
                details: `Imported { ${imp.importedName} } from "${imp.moduleSpecifier}", but it is not exported. Available: ${targetExports.join(', ')}`
              });
            }
          }
        }
      }
    }
  }

  // (d.2) Importing types as values (should be `import type`)
  for (const [f, analysis] of fileMap.entries()) {
    for (const imp of analysis.imports) {
      if (imp.targetFile && fileMap.has(imp.targetFile)) {
        const targetAnalysis = fileMap.get(imp.targetFile)!;
        
        // Find the export details in target
        const expDetail = targetAnalysis.exports.find(e => e.name === imp.importedName);
        if (expDetail && (expDetail.kind === 'interface' || expDetail.kind === 'type')) {
          // Target only exports this as a type/interface!
          // Check if this import is marked as type only
          if (!imp.isTypeOnly) {
            wrongImportsReport.push({
              filePath: analysis.relativeName,
              line: imp.line,
              type: 'type_imported_as_value',
              details: `Imported type/interface "${imp.importedName}" from "${imp.moduleSpecifier}" as a value. Recommendation: Use "import type { ${imp.importedName} }"`
            });
          }
        }
      }
    }
  }

  // (d.3) Circular imports
  const circularReport: CircularReportEntry[] = [];
  const dependencyGraph = new Map<string, string[]>();
  for (const [f, analysis] of fileMap.entries()) {
    const deps = analysis.imports
      .map(imp => imp.targetFile)
      .filter((t): t is string => t !== null && t !== f);
    dependencyGraph.set(f, Array.from(new Set(deps)));
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const currentPath: string[] = [];

  function findCycles(node: string) {
    if (stack.has(node)) {
      const cycleStartIdx = currentPath.indexOf(node);
      const cycle = currentPath.slice(cycleStartIdx).concat(node);
      const relCycle = cycle.map(absPath => path.relative(REPO_ROOT, absPath).replace(/\\/g, '/'));
      circularReport.push({
        path: relCycle.join(' -> '),
        length: relCycle.length - 1
      });
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    currentPath.push(node);

    const neighbors = dependencyGraph.get(node) || [];
    for (const neighbor of neighbors) {
      findCycles(neighbor);
    }

    currentPath.pop();
    stack.delete(node);
  }

  for (const f of fileMap.keys()) {
    findCycles(f);
  }

  // Filter circular report to avoid duplicates (e.g. A->B->A and B->A->B are the same cycle)
  const uniqueCycles: CircularReportEntry[] = [];
  const seenCycleSets = new Set<string>();
  for (const c of circularReport) {
    const nodes = c.path.split(' -> ').slice(0, -1).sort();
    const key = nodes.join('|');
    if (!seenCycleSets.has(key)) {
      seenCycleSets.add(key);
      uniqueCycles.push(c);
    }
  }

  // ----------------------------------------------------
  // (e) Unreachable code
  // ----------------------------------------------------
  const unreachableReport: ReportRow[] = [];
  for (const [f, analysis] of fileMap.entries()) {
    for (const un of analysis.unreachableCode) {
      unreachableReport.push({
        filePath: analysis.relativeName,
        line: un.line,
        message: un.message
      });
    }
  }

  // ----------------------------------------------------
  // (f) Duplicate or near-duplicate functions
  // ----------------------------------------------------
  // Let's analyze function declarations to find duplicates!
  const functionsList: { filePath: string; name: string; line: number; paramCount: number; text: string }[] = [];
  for (const [f, analysis] of fileMap.entries()) {
    // We walk the AST to collect all functions and their text
    const collectFuncs = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const text = node.getText(analysis.ast).trim();
        functionsList.push({
          filePath: analysis.relativeName,
          name: node.name.text,
          line: getLineNumber(analysis.ast, node.getStart()),
          paramCount: node.parameters.length,
          text
        });
      } else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) && ts.isIdentifier(node.name)) {
        const text = node.parent.getText(analysis.ast).trim();
        functionsList.push({
          filePath: analysis.relativeName,
          name: node.name.text,
          line: getLineNumber(analysis.ast, node.getStart()),
          paramCount: node.initializer.parameters.length,
          text
        });
      }
      node.forEachChild(collectFuncs);
    };
    collectFuncs(analysis.ast);
  }

  // Compare functions to find near-duplicates (identical name, or very high similarity, or identical body/parameters)
  const duplicateFunctionsReport: ReportRow[] = [];
  for (let i = 0; i < functionsList.length; i++) {
    for (let j = i + 1; j < functionsList.length; j++) {
      const f1 = functionsList[i]!;
      const f2 = functionsList[j]!;
      
      // Skip comparing in same file unless name is identical
      if (f1.filePath === f2.filePath && f1.name !== f2.name) continue;
      
      // Let's compare names and bodies
      const nameMatch = f1.name === f2.name;
      
      // Normalize bodies (remove whitespace and comments)
      const cleanBody = (t: string) => t.replace(/\s+/g, '').replace(/\/\/.*?\n/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const body1 = cleanBody(f1.text);
      const body2 = cleanBody(f2.text);
      const bodyMatch = body1 === body2 && body1.length > 30; // only match non-trivial bodies

      if (nameMatch || bodyMatch) {
        duplicateFunctionsReport.push({
          func1: { filePath: f1.filePath, line: f1.line, name: f1.name },
          func2: { filePath: f2.filePath, line: f2.line, name: f2.name },
          reason: nameMatch && bodyMatch ? 'Identical name and body' : nameMatch ? 'Identical function name' : 'Identical function body'
        });
      }
    }
  }

  // ----------------------------------------------------
  // (g) Suspicious "workaround" patterns
  // ----------------------------------------------------
  const workaroundsReport: ReportRow[] = [];
  for (const [f, analysis] of fileMap.entries()) {
    for (const wa of analysis.workarounds) {
      workaroundsReport.push({
        filePath: analysis.relativeName,
        line: wa.line,
        type: wa.type,
        details: wa.details
      });
    }
  }

  // Write the report
  const report = {
    unusedExports: unusedExportsReport,
    unusedLocals: unusedLocalsReport,
    unusedImports: unusedImportsReport,
    wrongImports: {
      typeMismatches: wrongImportsReport,
      circular: uniqueCycles
    },
    unreachableCode: unreachableReport,
    duplicateFunctions: duplicateFunctionsReport,
    workarounds: workaroundsReport
  };

  const reportPath = path.join(REPO_ROOT, 'scripts', 'hygiene-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Report successfully written to ${reportPath}`);
}

run();
