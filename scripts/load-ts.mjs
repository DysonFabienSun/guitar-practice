import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
export const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
export function createModuleLoader(overrides = {}) {
  const cache = new Map()
  return function moduleUrl(filename) {
    const absolute = path.resolve(filename)
    if (cache.has(absolute)) return cache.get(absolute)
    let source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    }).outputText.replace(/import ["'][^"']+\.css["'];?/g, '')
    source = source.replace(/from (["'])([^"']+)\1/g, (_, quote, specifier) => {
      if (overrides[specifier]) return `from '${overrides[specifier]}'`
      if (!specifier.startsWith('.')) return `from '${pathToFileURL(require.resolve(specifier)).href}'`
      const target = path.resolve(path.dirname(absolute), specifier)
      const resolved = [target, `${target}.ts`, `${target}.tsx`].find((file) => fs.existsSync(file) && fs.statSync(file).isFile())
      if (!resolved) throw new Error(`找不到模块 ${specifier}`)
      return `from '${moduleUrl(resolved)}'`
    })
    const url = dataUrl(source)
    cache.set(absolute, url)
    return url
  }
}
