// Compiles src/ with tlua into out/, then runs each test/*.test.lua on LuaJIT in its own process
// (with test/harness.lua for GMod). luajit and sqlite3 come from the repo's mise.toml.

import fs from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'

const root = path.join(import.meta.dir, '..')
const outDir = path.join(root, 'out')
const testDir = import.meta.dir

fs.rmSync(outDir, { recursive: true, force: true })
const tlua = Bun.spawnSync(['tlua', '-p', root], {
	cwd: root,
	stdout: 'inherit',
	stderr: 'inherit',
})
if (tlua.exitCode !== 0) {
	process.exit(tlua.exitCode ?? 1)
}

const only = process.argv.slice(2)
const files = [...new Glob('*.test.lua').scanSync(testDir)]
	.filter(
		(file) => only.length === 0 || only.some((name) => file.includes(name)),
	)
	.sort()

if (files.length === 0) {
	console.error(`No test file matches ${only.join(', ')}`)
	process.exit(1)
}

let failed = 0
for (const file of files) {
	console.log(file)
	const run = Bun.spawnSync(['luajit', path.join(testDir, file)], {
		cwd: root,
		env: { ...process.env, LUA_PATH: `${outDir}/?.lua;${testDir}/?.lua;;` },
		stdout: 'inherit',
		stderr: 'inherit',
	})
	if (run.exitCode !== 0) {
		failed++
	}
}

if (failed > 0) {
	console.error(`${failed} of ${files.length} test files failed`)
	process.exit(1)
}
