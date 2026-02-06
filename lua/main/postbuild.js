import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const bundlePath = 'dist/bundle.lua'
let dist = fs.readFileSync(bundlePath, 'utf8')
dist = dist
	.replace('$VERSION$', process.env.DONATOS_ADDON_VERSION ?? '')
	.replace('$BUILD_NUMBER$', process.env.GITHUB_RUN_NUMBER ?? '')
	.replace('$COMMIT_HASH$', process.env.GITHUB_SHA ?? '')

const repoRoot = path.resolve(import.meta.dir, '..', '..')
const uiRoot = path.join(repoRoot, 'ui')

execSync('bun run build', { cwd: uiRoot, stdio: 'inherit' })

const htmlPath = path.join(uiRoot, 'dist', 'index.html')
const html = fs.readFileSync(htmlPath, 'utf8')

const placeholder = '"__DONATOS_HTML__"'
if (process.env.DONATOS_POSTBUILD_DEBUG === '1') {
	console.log('[postbuild] html length:', html.length)
	console.log(
		'[postbuild] html contains "panel:SetHTML":',
		html.includes('panel:SetHTML'),
	)
	console.log('[postbuild] bundle length before:', dist.length)
	console.log(
		'[postbuild] bundle contains placeholder:',
		dist.includes(placeholder),
	)
}

function toLuaLongString(value) {
	const eq = '='.repeat(8)
	const open = `[${eq}[`
	const close = `]${eq}]`
	if (value.includes(close)) {
		throw new Error('HTML contains the static Lua long string delimiter.')
	}
	return `${open}${value}${close}`
}

if (!dist.includes(placeholder)) {
	throw new Error('Placeholder "__DONATOS_HTML__" not found in bundle.lua.')
}

const luaHtml = toLuaLongString(html)
const replaced = dist.replace(placeholder, () => luaHtml)
if (replaced === dist) {
	throw new Error('Failed to replace "__DONATOS_HTML__" in bundle.lua.')
}
dist = replaced

fs.writeFileSync(bundlePath, dist)
