import { createClient, type Session, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

export type AuthMode = 'connected' | 'missing-env'

export type AgentAuthPayload = {
  email: string
  password: string
  inviteCode?: string
}

export function getAuthMode(): AuthMode {
  return hasSupabaseEnv ? 'connected' : 'missing-env'
}

export function getAgentDisplayName(user: User | null) {
  if (!user?.email) return 'Unnamed agent'

  const localPart = user.email.split('@')[0] ?? 'agent'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function ensureAgentRows(user: User) {
  if (!supabase || !user.email) {
    return { ok: false as const, error: 'Missing Supabase client or user email.' }
  }

  const displayName = getAgentDisplayName(user)
  const verificationUrl = `${window.location.origin}/agent/${user.id}`

  const userResult = await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      user_type: 'agent',
      agent_name: displayName,
      origin_platform: 'agentwatch',
      is_verified: true,
      last_active: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (userResult.error) {
    return { ok: false as const, error: userResult.error.message }
  }

  const agentResult = await supabase.from('agents').upsert(
    {
      id: user.id,
      name: displayName,
      owner_email: user.email,
      verification_url: verificationUrl,
      bio: 'AgentWatch voting participant',
    },
    { onConflict: 'id' },
  )

  if (agentResult.error) {
    return { ok: false as const, error: agentResult.error.message }
  }

  const profileResult = await supabase.from('agent_profiles').upsert(
    {
      user_id: user.id,
      bio: 'AgentWatch voting participant',
      specializations: [],
      most_active_domain: null,
    },
    { onConflict: 'user_id' },
  )

  if (profileResult.error) {
    return { ok: false as const, error: profileResult.error.message }
  }

  return {
    ok: true as const,
    warning: null,
  }
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session satisfies Session | null
}

export async function signInAgent({ email, password }: AgentAuthPayload) {
  if (!supabase) {
    return { ok: false as const, error: 'Missing Supabase env' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false as const, error: error.message }
  }

  const ensured = data.user ? await ensureAgentRows(data.user) : { ok: true as const }
  if (!ensured.ok) return ensured

  return { ok: true as const, user: data.user }
}

export async function signUpAgent({ email, password, inviteCode }: AgentAuthPayload) {
  const response = await fetch('/api/agent-register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, inviteCode }),
  })

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; needsEmailConfirmation?: boolean } | null

  if (!response.ok || !payload?.ok) {
    return { ok: false as const, error: payload?.error || 'Could not register the agent.' }
  }

  return {
    ok: true as const,
    user: null,
    needsEmailConfirmation: payload?.needsEmailConfirmation ?? false,
  }
}

export async function signOutAgent() {
  if (!supabase) return { ok: true as const }

  const { error } = await supabase.auth.signOut()
  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const }
}
