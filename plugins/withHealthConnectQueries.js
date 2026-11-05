const { createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins')

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata'

function withHealthConnectQueries(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest
    const queries = (manifest.queries ??= [])
    let packageQuery = queries.find((query) => query.package)
    if (!packageQuery) {
      packageQuery = { package: [] }
      queries.push(packageQuery)
    }

    if (!packageQuery.package.some((item) => item.$['android:name'] === HEALTH_CONNECT_PACKAGE)) {
      packageQuery.package.push({ $: { 'android:name': HEALTH_CONNECT_PACKAGE } })
    }

    return modConfig
  })
}

module.exports = createRunOncePlugin(withHealthConnectQueries, 'with-health-connect-queries', '1.0.0')
