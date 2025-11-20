// Quick script to check if Microsoft SSO environment variables are set
require('dotenv').config()

const requiredVars = [
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
]

console.log('Checking Microsoft SSO environment variables...\n')

const missing = []
const present = []

requiredVars.forEach((varName) => {
  if (process.env[varName]) {
    present.push(varName)
    console.log(`✓ ${varName} is set`)
  } else {
    missing.push(varName)
    console.log(`✗ ${varName} is NOT set`)
  }
})

console.log('\n' + '='.repeat(50))

if (missing.length === 0) {
  console.log('\n✅ All required environment variables are set!')
  console.log('Microsoft SSO should be enabled.')
} else {
  console.log(`\n⚠️  Missing ${missing.length} environment variable(s):`)
  missing.forEach((v) => console.log(`   - ${v}`))
  console.log('\nMicrosoft SSO will NOT be available until these are set.')
  console.log('See MICROSOFT_SSO_SETUP.md for setup instructions.')
}

if (present.length > 0) {
  console.log('\nOptional SharePoint variables:')
  if (process.env.SHAREPOINT_SITE_ID) {
    console.log('✓ SHAREPOINT_SITE_ID is set')
  } else {
    console.log('○ SHAREPOINT_SITE_ID is not set (will use default site)')
  }
  if (process.env.SHAREPOINT_DRIVE_ID) {
    console.log('✓ SHAREPOINT_DRIVE_ID is set')
  } else {
    console.log('○ SHAREPOINT_DRIVE_ID is not set (will use default drive)')
  }
}

