import { existsSync, readFileSync, readdirSync } from "node:fs"
import * as Path from "node:path"
import { Predicate } from "effect"
import { isPureDomainModule } from "./layout.ts"

type Loc = { readonly start: { readonly line: number }; readonly end: { readonly line: number } }

type Node = { readonly type: string; readonly loc: Loc; readonly parent?: Node | null }

type Report = { readonly node: Node; readonly message: string }

type Context = {
  readonly filename: string
  readonly report: (report: Report) => void
  readonly sourceCode: { readonly getAllComments: () => ReadonlyArray<Node> }
}

type Visitor = Readonly<Record<string, (node: Node) => void>>

type Rule = { readonly meta: { readonly type: "problem" }; readonly create: (context: Context) => Visitor }

type Member = {
  readonly root: string
  readonly kind: "apps" | "packages" | "suite"
  readonly name: string
  readonly dir: string
}

const isNode = (value: unknown): value is Node => Predicate.hasProperty(value, "type") && Predicate.isString(value.type)

const field = (node: unknown, key: string): unknown => (Predicate.hasProperty(node, key) ? node[key] : undefined)

const nameOf = (node: unknown): string | undefined => {
  const name = field(node, "name")

  return Predicate.isString(name) ? name : undefined
}

const stringValue = (node: unknown): string | undefined => {
  const value = field(node, "value")

  return Predicate.isString(value) ? value : undefined
}

const memberParts = (
  node: unknown
): { readonly object: string | undefined; readonly property: string | undefined } => ({
  object: nameOf(field(node, "object")),
  property: nameOf(field(node, "property"))
})

const isFunction = (node: Node): boolean =>
  ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)

const rule = (create: (context: Context) => Visitor): Rule => ({ meta: { type: "problem" }, create })

const reportAll =
  (context: Context, message: string) =>
  (node: Node): void =>
    context.report({ node, message })

const posix = (file: string): string => file.split(Path.sep).join("/")

const workspaceMember = /^(.*)\/(apps|packages)\/([^/]+)\//

const suiteMember = /^(.*)\/suite\//

const kindOf = (kind: string | undefined): "apps" | "packages" => (kind === "apps" ? "apps" : "packages")

const workspaceOf = (path: string): Member | undefined => {
  const found = workspaceMember.exec(path)
  if (found === null) return undefined
  const root = found[1] ?? ""
  const kind = kindOf(found[2])
  const name = found[3] ?? ""

  return { root, kind, name, dir: `${root}/${kind}/${name}/` }
}

const suiteOf = (path: string): Member | undefined => {
  const found = suiteMember.exec(path)
  if (found === null) return undefined
  const root = found[1] ?? ""

  return { root, kind: "suite", name: "suite", dir: `${root}/suite/` }
}

const deeper = (a: Member | undefined, b: Member | undefined): Member | undefined => {
  if (a === undefined) return b
  if (b === undefined) return a

  return b.root.length > a.root.length ? b : a
}

const memberOf = (file: string): Member | undefined => {
  const path = posix(Path.resolve(file))

  return deeper(workspaceOf(path), suiteOf(path))
}

const srcPath = (file: string): string | undefined => {
  const normalized = posix(Path.resolve(file))
  const member = memberOf(file)
  const inPackageSource = member?.kind === "packages" && normalized.startsWith(`${member.dir}src/`)
  if (inPackageSource) return `${member.name}/${normalized.slice(`${member.dir}src/`.length)}`
  const index = normalized.lastIndexOf("/src/")

  return index === -1 ? undefined : normalized.slice(index + "/src/".length)
}

const workspacePackage = /^@effect-workflow\/([^/]+)(?:\/(.+))?$/

const nameIn = (dir: string): string => {
  const manifest = `${dir}/package.json`
  if (!existsSync(manifest)) return Path.basename(dir)
  const name: unknown = JSON.parse(readFileSync(manifest, "utf8")).name
  if (!Predicate.isString(name)) return Path.basename(dir)

  return name.replace(/^@effect-workflow\//, "")
}

const workspacePackages = (root: string): ReadonlySet<string> =>
  new Set(
    existsSync(`${root}/packages`)
      ? readdirSync(`${root}/packages`).map((name) => nameIn(`${root}/packages/${name}`))
      : []
  )

const packageTarget = (specifier: string): string | undefined => {
  const found = workspacePackage.exec(specifier)
  if (found === null) return undefined

  return `${found[1]}/${found[2] ?? "index.ts"}`
}

const resolveTarget = (file: string, specifier: string): string | undefined =>
  specifier.startsWith(".") ? srcPath(Path.resolve(Path.dirname(file), specifier)) : packageTarget(specifier)

const domainOf = (path: string | undefined): string | undefined =>
  path?.startsWith("domains/") === true ? path.split("/")[1] : undefined

const isTestFile = (file: string): boolean => file.endsWith(".test.ts") || posix(file).includes("/test/")

const isEntryPoint = (file: string): boolean => {
  if (srcPath(file) === "app/server.ts") return true

  return /\/tools\/[^/]+\.ts$/.test(posix(file))
}

const isSqlImport = (specifier: string): boolean => specifier === "effect/sql" || specifier.startsWith("@effect/sql")

const mayImportSql = (file: string, path: string | undefined): boolean => {
  if (file.endsWith("Repo.ts")) return true
  if (posix(file).endsWith("/migrations.ts")) return true
  if (isTestFile(file)) return true

  if (path?.startsWith("platform/") === true) return true

  return path?.startsWith("framework/") === true
}

const serviceBuilders = new Set(["Context", "Layer"])

const importsService = (specifier: string, names: ReadonlyArray<string>): boolean =>
  specifier === "effect" && names.some((name) => serviceBuilders.has(name))

const leavesMember = (file: string, specifier: string): boolean => {
  if (!specifier.startsWith(".")) return false
  const member = memberOf(file)
  if (member === undefined) return false

  return !posix(Path.resolve(Path.dirname(file), specifier)).startsWith(member.dir)
}

const composesApp = (member: Member, entry: string | undefined): boolean => {
  if (member.kind === "packages") return false
  if (entry === "Api.ts") return true

  return member.kind === "suite" && entry === "Application.ts"
}

const importsApp = (file: string, specifier: string): string | undefined => {
  const found = workspacePackage.exec(specifier)
  if (found === null) return undefined
  const member = memberOf(file)
  if (member === undefined) return undefined
  const name = found[1] ?? ""
  if (workspacePackages(member.root).has(name)) return undefined

  return composesApp(member, found[2]) ? undefined : name
}

const memberViolation = (file: string, specifier: string): string | undefined => {
  if (leavesMember(file, specifier))
    return "a relative import must stay inside its own app or package; depend on a declared @effect-workflow package"
  const app = importsApp(file, specifier)
  if (app === undefined) return undefined

  return `${specifier} is private to the ${app} app; other apps and suite/ use its public Api.ts, and only suite/ composes Application.ts`
}

const domainViolation = (file: string, specifier: string, names: ReadonlyArray<string>): string | undefined => {
  const from = srcPath(file)
  const fromDomain = domainOf(from)
  const targetDomain = domainOf(resolveTarget(file, specifier))

  if (fromDomain !== undefined && targetDomain !== undefined && fromDomain !== targetDomain)
    return `domains/${fromDomain} must not import domains/${targetDomain}; put cross-domain steps in a handler`
  if (from?.startsWith("client/") === true && specifier.startsWith("@effect-workflow/platform"))
    return "browser code must not import the platform; it runs apps on the server"
  if (isSqlImport(specifier) && !mayImportSql(file, from))
    return "only *Repo.ts, migrations.ts, the framework and the platform may import effect/sql"
  if (isPureDomainModule(from ?? "") && importsService(specifier, names))
    return "a concept module holds types and pure functions; services and layers belong in the domain's service"
  if (posix(file).endsWith("/handlers.ts") && /^effect\/(rpc|ai|http)/.test(specifier))
    return "handlers orchestrate domain services; transports belong in the framework and app/"

  return undefined
}

const importedNames = (node: Node): ReadonlyArray<string> => {
  const specifiers = field(node, "specifiers")
  if (!Array.isArray(specifiers)) return []

  return specifiers.flatMap((specifier: unknown) => {
    const name = nameOf(field(specifier, "imported"))

    return name === undefined ? [] : [name]
  })
}

const checkSource = (context: Context) => (node: Node) => {
  const specifier = stringValue(field(node, "source"))
  if (specifier === undefined) return

  const message =
    memberViolation(context.filename, specifier) ?? domainViolation(context.filename, specifier, importedNames(node))
  if (message === undefined) return

  context.report({ node, message })
}

const mutatingMethods = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"])

const isModuleName = (name: string | undefined): boolean => name !== undefined && /^[A-Z]/.test(name)

const freshValueTypes = new Set([
  "ObjectExpression",
  "ArrayExpression",
  "ArrowFunctionExpression",
  "FunctionExpression"
])

const isFreshValue = (node: unknown): boolean => isNode(node) && freshValueTypes.has(node.type)

const freshReceiverTypes = new Set(["CallExpression", "NewExpression", "ArrayExpression", "AwaitExpression"])

const hasFreshReceiver = (callee: unknown): boolean => {
  const receiver = field(callee, "object")

  return isNode(receiver) && freshReceiverTypes.has(receiver.type)
}

const nestedInIf = (node: Node): boolean => {
  const parent: unknown = node.parent
  if (!isNode(parent)) return false
  if (isFunction(parent)) return false
  if (parent.type === "IfStatement" && field(parent, "alternate") === node) return nestedInIf(parent)
  if (parent.type === "IfStatement") return true

  return nestedInIf(parent)
}

const isEffectGenCall = (node: unknown): boolean => {
  if (!isNode(node) || node.type !== "CallExpression") return false

  const callee = memberParts(field(node, "callee"))

  return callee.object === "Effect" && callee.property === "gen"
}

const returnsOnlyEffectGen = (body: unknown): boolean => {
  if (isEffectGenCall(body)) return true
  if (!isNode(body) || body.type !== "BlockStatement") return false

  const statements = field(body, "body")
  if (!Array.isArray(statements) || statements.length !== 1) return false

  return isEffectGenCall(field(statements[0], "argument"))
}

const isThunkArgument = (node: Node): boolean => {
  const params = field(node, "params")
  if (!Array.isArray(params) || params.length > 0) return false

  return node.parent?.type === "CallExpression"
}

const isAsConst = (node: Node): boolean => nameOf(field(field(node, "typeAnnotation"), "typeName")) === "const"

const kitStyle = /\/packages\/ui\/src\/(parts|components|layouts)\/[^/.]+\.ts$/

const rawValue = /(?<![\w.$-])(?!0*\.?0+(px|ms|s)\b)\d*\.?\d+(px|ms|s)\b|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

const numericProperties = new Set(["zIndex", "opacity"])

const children = (node: Node): ReadonlyArray<Node> =>
  Object.entries(node).flatMap(([key, value]) => {
    if (key === "parent") return []
    if (Array.isArray(value)) return value.filter(isNode)
    return isNode(value) ? [value] : []
  })

const descendants = (node: Node): ReadonlyArray<Node> => [node, ...children(node).flatMap(descendants)]

const isStylexCreate = (node: Node): boolean => {
  const parts = memberParts(field(node, "callee"))
  return parts.object === "stylex" && parts.property === "create"
}

const isRawNumber = (node: Node): boolean => {
  const value = field(node, "value")
  if (typeof value !== "number") return false
  if (value === 0 || value === 1) return false
  const property = field(node.parent, "key")
  return numericProperties.has(nameOf(property) ?? "")
}

const rawIn = (node: Node): boolean => {
  if (node.type === "TemplateElement") {
    const raw = field(field(node, "value"), "raw")
    return Predicate.isString(raw) && rawValue.test(raw)
  }
  if (node.type === "Literal") return rawValue.test(stringValue(node) ?? "") || isRawNumber(node)
  return false
}

const runtimes = new Set(["Effect", "BunRuntime", "NodeRuntime"])

const transportMakers = new Set(["Rpc", "RpcGroup", "Tool", "Toolkit"])

const endpointModule = /\/packages\/client\/src\/Endpoint\.ts$/

const buildsTransport = (parts: ReturnType<typeof memberParts>): boolean => {
  if (parts.object === undefined) return false
  if (parts.object.startsWith("HttpApi")) return true
  return transportMakers.has(parts.object) && parts.property === "make"
}

const rules: Readonly<Record<string, Rule>> = {
  "no-loops": rule((context) => {
    const report = reportAll(context, "no loops; use Array methods, Effect.forEach or recursion")

    return {
      ForStatement: report,
      ForInStatement: report,
      ForOfStatement: report,
      WhileStatement: report,
      DoWhileStatement: report
    }
  }),

  "no-let": rule((context) => ({
    VariableDeclaration: (node) => {
      const kind = field(node, "kind")
      if (kind !== "let" && kind !== "var") return

      context.report({ node, message: "const only; no let or var" })
    }
  })),

  "no-mutation": rule((context) => ({
    CallExpression: (node) => {
      const parts = memberParts(field(node, "callee"))
      const args = field(node, "arguments")
      const first = Array.isArray(args) ? args[0] : undefined

      if (parts.object === "Object" && parts.property === "assign" && !isFreshValue(first))
        return context.report({
          node,
          message: "Object.assign onto an existing value mutates it; spread into a new object"
        })
      if (parts.property === undefined || !mutatingMethods.has(parts.property)) return
      if (isModuleName(parts.object)) return
      if (hasFreshReceiver(field(node, "callee"))) return

      context.report({
        node,
        message: `${parts.property}() mutates in place; use a non-mutating alternative (toSorted, toReversed, spread)`
      })
    },
    AssignmentExpression: (node) => {
      if (field(field(node, "left"), "type") !== "MemberExpression") return

      context.report({ node, message: "no property assignment; build a new value" })
    },
    UpdateExpression: reportAll(context, "no ++ or --; build a new value")
  })),

  "no-comments": rule((context) => ({
    Program: () =>
      context.sourceCode.getAllComments().forEach(reportAll(context, "no comments; rationale goes in the commit"))
  })),

  "no-nested-if": rule((context) => ({
    IfStatement: (node) => {
      if (!nestedInIf(node)) return

      context.report({ node, message: "no nested if; use guard clauses or a named helper" })
    }
  })),

  "no-multiline-logical": rule((context) => ({
    LogicalExpression: (node) => {
      if (node.parent?.type === "LogicalExpression") return
      if (field(node, "operator") === "??") return
      if (node.loc.start.line === node.loc.end.line) return

      context.report({
        node,
        message: "no multi-line && / || chains; move the condition into a named helper of guard clauses"
      })
    }
  })),

  "no-casts": rule((context) => ({
    TSAsExpression: (node) => {
      if (isAsConst(node)) return

      context.report({ node, message: "no casts; restructure until it typechecks" })
    },
    TSTypeAssertion: reportAll(context, "no casts; restructure until it typechecks")
  })),

  "run-at-entry-only": rule((context) => ({
    MemberExpression: (node) => {
      const parts = memberParts(node)
      if (parts.object === undefined || !runtimes.has(parts.object)) return
      if (parts.property === undefined || !parts.property.startsWith("run")) return
      if (isEntryPoint(context.filename)) return

      context.report({ node, message: "Effect.run* and runMain belong only in src/app/server.ts and tools/ scripts" })
    }
  })),

  "no-gen-wrapper": rule((context) => {
    const check = (node: Node) => {
      if (isThunkArgument(node)) return
      if (!returnsOnlyEffectGen(field(node, "body"))) return

      context.report({
        node,
        message: "a function that only returns Effect.gen should be Effect.fn or Effect.fnUntraced"
      })
    }

    return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check }
  }),

  "theme-values-only": rule((context) => {
    if (!kitStyle.test(context.filename)) return {}

    return {
      CallExpression: (node) => {
        if (!isStylexCreate(node)) return

        descendants(node)
          .filter(rawIn)
          .forEach((found) =>
            context.report({
              node: found,
              message:
                "no raw values in kit styles; use a theme token (space, size, box, radius, type, shadow, colors, stacking, opacity, motion)"
            })
          )
      }
    }
  }),

  "endpoints-in-client": rule((context) => {
    if (endpointModule.test(posix(context.filename))) return {}

    return {
      MemberExpression: (node) => {
        if (!buildsTransport(memberParts(node))) return

        context.report({
          node,
          message:
            "RPCs, MCP tools and HTTP APIs are built only in a project's packages/client/src/Endpoint.ts; declare the call with Endpoint.call or Endpoint.stream and derive the group with Endpoint.group or Endpoint.toolkit"
        })
      }
    }
  }),

  boundaries: rule((context) => {
    const check = checkSource(context)

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check
    }
  })
}

export default { meta: { name: "house" }, rules }
