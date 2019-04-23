const os = require('os')
const vscode = require('vscode')
const getRandomItem = require('../utils/get-random-item')
const {CODEFACE, LINUX, MAC_OS, USER, WINDOWS} = require('./font-family-types')

// TODO: provide documenation for font installation on MacOS & Windows
const allFontFamilies = [
  ...require('./codeface-font-families'),
  ...require('./system-font-families'),
  // 'AHAMONO',
]

module.exports = {
  activateFontFamilies,
  maybeShiftFontFamilyOnStartup,
  setRandomFontFamily,
  getFontFamilies,
  getCurrentFontFamily,
  favoriteCurrentFontFamily,
  setFontFamily,
  allFontFamilies,
  __getFontFamiliesCache,
}

let fontFamiliesCache = null

async function activateFontFamilies(context) {
  primeFontFamiliesCache()
  await maybeShiftFontFamilyOnStartup()

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'shifty.shiftFontFamily',
      setRandomFontFamily,
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'shifty.favoriteCurrentFontFamily',
      favoriteCurrentFontFamily,
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'shifty.ignoreCurrentFontFamily',
      async () => {
        const currentFontFamily = getCurrentFontFamily()

        const config = vscode.workspace.getConfiguration('shifty.fontFamilies')
        await config.update(
          'ignoreFontFamilies',
          [...new Set([...config.ignoreFontFamilies, currentFontFamily])],
          true,
        )

        await setRandomFontFamily()
      },
    ),
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (
        event.affectsConfiguration('shifty.fontFamilies') ||
        event.affectsConfiguration('shifty.favoritesEnabled')
      ) {
        fontFamiliesCache = null
        primeFontFamiliesCache()
      }
    }),
  )
}

async function maybeShiftFontFamilyOnStartup() {
  const config = vscode.workspace.getConfiguration('shifty.startup')
  if (config.shiftFontFamilyOnStartup) {
    await setRandomFontFamily()
  }
}

function primeFontFamiliesCache() {
  if (fontFamiliesCache !== null) return

  const {
    favoritesEnabled,
    fontFamilies: {
      favoriteFontFamilies,
      ignoreCodefaceFontFamilies,
      ignoreFontFamilies,
      includeFontFamilies,
    },
  } = vscode.workspace.getConfiguration('shifty')

  if (favoritesEnabled) {
    fontFamiliesCache = favoriteFontFamilies
    return
  }

  fontFamiliesCache = [
    ...allFontFamilies.filter(
      ff =>
        !(
          ignoreFontFamilies.includes(ff.id) ||
          (ignoreCodefaceFontFamilies && ff.type === CODEFACE) ||
          !ff.supportedPlatforms.includes(os.type())
        ),
    ),
    ...includeFontFamilies.map(ff => ({
      id: ff,
      supportedPlatforms: [LINUX, MAC_OS, WINDOWS],
      type: USER,
    })),
  ]
}

async function setRandomFontFamily() {
  const fontFamilies = getFontFamilies()
  const {id} = getRandomItem(fontFamilies)
  await setFontFamily(id)
}

function getFontFamilies() {
  if (fontFamiliesCache !== null) {
    primeFontFamiliesCache()
  }

  const currentFontFamily = getCurrentFontFamily()
  return fontFamiliesCache.filter(ff => ff.id !== currentFontFamily)
}

function getCurrentFontFamily() {
  const {fontFamily} = vscode.workspace.getConfiguration('editor')
  const [editorFontFamily] = fontFamily.split(',')
  return editorFontFamily
}

async function favoriteCurrentFontFamily() {
  const currentFontFamily = getCurrentFontFamily()

  const config = vscode.workspace.getConfiguration('shifty.fontFamilies')
  await config.update(
    'favoriteFontFamilies',
    [...new Set([...config.favoriteFontFamilies, currentFontFamily])],
    true,
  )

  vscode.window.showInformationMessage(
    `Added "${currentFontFamily}" to favorites`,
  )
}

async function setFontFamily(fontFamily) {
  const {fallbackFontFamily} = vscode.workspace.getConfiguration(
    'shifty.fontFamilies',
  )

  return vscode.workspace
    .getConfiguration('editor')
    .update('fontFamily', `${fontFamily}, ${fallbackFontFamily}`, true)
}

function __getFontFamiliesCache() {
  return fontFamiliesCache
}
