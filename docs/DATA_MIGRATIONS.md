# Local data versions and recovery

Web storage has `umn.storageVersion=1`; normalized APAS profiles use `schemaVersion=1`. Legacy profiles without a version are accepted only after bounded shape validation. Migration adds a version without adding campus identity, course completions, credit totals or rule authority. Profile validation rejects unknown root fields, future profile versions, malformed rules/courses, negative credit totals, excessive nesting and prototype keys.

Web and extension validate profiles when reading state as well as importing. Invalid stored profiles are not used for planning and are retained in the underlying storage so an upgrade does not silently delete user data. Reimport a current APAS audit through the connection panel to recover. A future Web storage version is not downgraded on page load. Explicit import establishes the current version. Preferences are normalized to bounded defaults; malformed saved snapshots are ignored. Snapshots remain subject to rebuild before registration.

Extension updates set storageVersion=1 and restrict storage access to trusted extension contexts. The profile's own version is the authority for compatibility. Invalid incoming APAS messages never overwrite a valid existing profile. A future profile version is not interpreted by an older build.

Shape validation is not cryptographic authentication: software or the user with access to the local browser profile can edit local academic records. Smart UMN does not claim that browser storage is an authoritative UMN audit. Official APAS and registration remain authoritative.

Anonymous APAS corpus schema v1 is a separate strict allowlist; local normalized profiles must never enter it. Public evidence SQLite uses PRAGMA user_version=1 with additive CREATE TABLE IF NOT EXISTS migration from version 0, and refuses future versions without modifying their tables. Any future destructive migration needs a backup and rollback gate before deployment.
