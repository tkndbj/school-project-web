# Security

Report vulnerabilities privately through GitHub security advisories. Do not post
student data, session tokens, administrator passwords or database credentials in
public issues. Supabase RLS and database functions enforce tenant/parent isolation;
platform access additionally requires a verified MFA session.

Store the server secret only in server runtime configuration. Protect the
production branch/environment, require CI checks and review dependency updates.
Rotate exposed credentials and revoke affected sessions during an incident.
See docs/production.md for recovery and backups.
