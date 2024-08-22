const fs = require('node:fs')

const path = 'dist/bundle.lua'
let dist = fs.readFileSync(path, 'utf8')
dist = dist
  .replace('$VERSION$', process.env.DONATOS_ADDON_VERSION)
  .replace('$BUILD_NUMBER$', process.env.GITHUB_RUN_NUMBER)
  .replace('$COMMIT_HASH$', process.env.GITHUB_SHA)
fs.writeFileSync(path, dist)

/*fs.writeFileSync(
  'dist/build.json',
  JSON.stringify({ id: process.env.GITHUB_RUN_NUMBER, files: { bundle: 'bundle.lua' } }),
)*/
