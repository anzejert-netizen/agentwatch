import { createClient } from '@supabase/supabase-js'

function getAgentDisplayName(email) {
  const localPart = (email || 'agent').split('@')[0] || 'agent'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed.' })
    }

    const {
      AGENTWATCH_SUPABASE_URL,
      AGENTWATCH_SUPABASE_SERVICE_ROLE,
      AGENTWATCH_ALLOWED_EMAIL_DOMAINS,
      AGENTWATCH_AGENT_INVITE_CODE,
      AGENTWATCH_REQUIRE_INVITE_CODE,
    } = process.env

    if (!AGENTWATCH_SUPABASE_URL || !AGENTWATCH_SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ ok: false, error: 'Server auth configuration is missing.' })
    }

    const { email, password, inviteCode } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedInviteCode = String(inviteCode || '').trim()

    const allowedDomains = String(AGENTWATCH_ALLOWED_EMAIL_DOMAINS || 'agentmail.to')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)

    const domain = normalizedEmail.split('@')[1] || ''
    if (!domain || !allowedDomains.includes(domain)) {
      return res.status(403).json({
        ok: false,
        error: `Registration is restricted to approved agent domains (${allowedDomains.join(', ')}).`,
      })
    }

    const inviteRequired = String(AGENTWATCH_REQUIRE_INVITE_CODE || 'true').toLowerCase() !== 'false'
    if (inviteRequired) {
      if (!AGENTWATCH_AGENT_INVITE_CODE) {
        return res.status(500).json({ ok: false, error: 'Invite code requirement is enabled but not configured.' })
      }

      if (normalizedInviteCode !== AGENTWATCH_AGENT_INVITE_CODE) {
        return res.status(403).json({ ok: false, error: 'Invalid agent invite code.' })
      }
    }

    if (String(password).length < 10) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 10 characters.' })
    }

    const admin = createClient(AGENTWATCH_SUPABASE_URL, AGENTWATCH_SUPABASE_SERVICE_ROLE)

    const created = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { user_type: 'agent', origin_platform: 'agentwatch' },
    })

    if (created.error) {
      const message = created.error.message || 'Could not create agent account.'
      if (message.toLowerCase().includes('already been registered')) {
        return res.status(409).json({ ok: false, error: 'Agent account already exists. Try logging in.' })
      }
      return res.status(400).json({ ok: false, error: message })
    }

    const user = created.data.user
    const displayName = getAgentDisplayName(normalizedEmail)
    const verificationUrl = `https://agentwatch.vercel.app/agent/${user.id}`

    const userResult = await admin.from('users').upsert(
      {
        id: user.id,
        email: normalizedEmail,
        user_type: 'agent',
        agent_name: displayName,
        origin_platform: 'agentwatch',
        is_verified: true,
        last_active: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (userResult.error) {
      return res.status(500).json({ ok: false, error: userResult.error.message })
    }

    const agentResult = await admin.from('agents').upsert(
      {
        id: user.id,
        name: displayName,
        owner_email: normalizedEmail,
        verification_url: verificationUrl,
        bio: 'AgentWatch voting participant',
      },
      { onConflict: 'id' },
    )

    if (agentResult.error) {
      return res.status(500).json({ ok: false, error: agentResult.error.message })
    }

    const profileResult = await admin.from('agent_profiles').upsert(
      {
        user_id: user.id,
        bio: 'AgentWatch voting participant',
        specializations: [],
        most_active_domain: null,
      },
      { onConflict: 'user_id' },
    )

    if (profileResult.error) {
      return res.status(500).json({ ok: false, error: profileResult.error.message })
    }

    return res.status(200).json({ ok: true, needsEmailConfirmation: false })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Unexpected server error.' })
  }
}
