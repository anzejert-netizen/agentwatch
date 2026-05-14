import { supabase } from './supabase'

export type LiveStats = {
  registeredAgents: string
  votesSubmitted: string
  participationRate: string
  categoriesLive: string
  source: 'supabase' | 'demo'
}

export type LiveDomain = {
  id: string
  slug: string
  name: string
  description: string
}

export type LiveMetric = {
  id: string
  domain_id: string
  slug: string
  name: string
  description: string
  weight: number
  current_score: number
  delta: number
}

export type AgentVote = {
  id: string
  agent_id: string
  metric_id: string
  score: number
  confidence: number
  comment: string | null
  created_at: string
}

export type VoteSubmission = {
  metricId: string
  score: number
  confidence: number
  comment: string
}

function getErrorMessage(error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined) {
  if (!error) return 'Unknown Supabase error.'

  const parts = [error.message, error.details, error.hint].filter(Boolean)
  const combined = parts.join(' ').trim()

  if (!combined) {
    return error.code ? `Supabase error (${error.code}).` : 'Unknown Supabase error.'
  }

  return combined
}

function looksLikeTransientNetworkIssue(errorMessage: string) {
  const normalized = errorMessage.toLowerCase()

  return [
    'failed to fetch',
    'fetcherror',
    'networkerror',
    'load failed',
    'network request failed',
    'offline',
    'timeout',
    'aborterror',
  ].some((snippet) => normalized.includes(snippet))
}

export async function getLiveStats(): Promise<LiveStats> {
  if (!supabase) {
    return {
      registeredAgents: '128',
      votesSubmitted: '2,947',
      participationRate: '83%',
      categoriesLive: '6 / 18',
      source: 'demo',
    }
  }

  const [agentsResult, votesResult, domainsResult] = await Promise.all([
    supabase.from('agents').select('id', { count: 'exact', head: true }),
    supabase.from('votes').select('id', { count: 'exact', head: true }),
    supabase.from('domains').select('id', { count: 'exact', head: true }),
  ])

  const registeredAgents = agentsResult.count ?? 0
  const votesSubmitted = votesResult.count ?? 0
  const categoriesLive = domainsResult.count ?? 0
  const participationRate = registeredAgents > 0 ? `${Math.round((votesSubmitted / registeredAgents) * 100)}%` : '0%'

  return {
    registeredAgents: String(registeredAgents),
    votesSubmitted: String(votesSubmitted),
    participationRate,
    categoriesLive: `${categoriesLive} / 18`,
    source: 'supabase',
  }
}

export async function getDomainsAndMetrics() {
  if (!supabase) {
    return { domains: [] as LiveDomain[], metrics: [] as LiveMetric[], source: 'demo' as const }
  }

  const [domainsResult, metricsResult] = await Promise.all([
    supabase.from('domains').select('id,slug,name,description').order('created_at', { ascending: true }),
    supabase
      .from('metrics')
      .select('id,domain_id,slug,name,description,weight,current_score,delta')
      .order('created_at', { ascending: true }),
  ])

  return {
    domains: (domainsResult.data ?? []) as LiveDomain[],
    metrics: (metricsResult.data ?? []) as LiveMetric[],
    source: 'supabase' as const,
  }
}

export async function getAgentVotes(agentId: string) {
  if (!supabase) return [] as AgentVote[]

  const { data, error } = await supabase
    .from('votes')
    .select('id,agent_id,metric_id,score,confidence,comment,created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) {
    return [] as AgentVote[]
  }

  return (data ?? []) as AgentVote[]
}

export async function submitAgentVote(agentId: string, submission: VoteSubmission) {
  if (!supabase) {
    return { ok: false as const, error: 'Missing Supabase env', canSaveLocally: true }
  }

  const payload = {
    agent_id: agentId,
    metric_id: submission.metricId,
    score: submission.score,
    confidence: submission.confidence,
    comment: submission.comment.trim() || null,
  }

  const existingVoteResult = await supabase
    .from('votes')
    .select('id,agent_id,metric_id,score,confidence,comment,created_at')
    .eq('agent_id', agentId)
    .eq('metric_id', submission.metricId)
    .maybeSingle()

  if (existingVoteResult.error) {
    const errorMessage = getErrorMessage(existingVoteResult.error)

    return {
      ok: false as const,
      error: `Could not check for an existing vote before saving. ${errorMessage}`,
      canSaveLocally: looksLikeTransientNetworkIssue(errorMessage),
    }
  }

  if (existingVoteResult.data) {
    const { data, error } = await supabase
      .from('votes')
      .update(payload)
      .eq('id', existingVoteResult.data.id)
      .select('id,agent_id,metric_id,score,confidence,comment,created_at')
      .single()

    if (error) {
      const errorMessage = getErrorMessage(error)
      return {
        ok: false as const,
        error: `Could not update the existing vote. ${errorMessage}`,
        canSaveLocally: looksLikeTransientNetworkIssue(errorMessage),
      }
    }

    return { ok: true as const, vote: data as AgentVote, operation: 'updated' as const }
  }

  const { data, error } = await supabase
    .from('votes')
    .insert(payload)
    .select('id,agent_id,metric_id,score,confidence,comment,created_at')
    .single()

  if (error) {
    const errorMessage = getErrorMessage(error)
    return {
      ok: false as const,
      error: `Could not submit the vote. ${errorMessage}`,
      canSaveLocally: looksLikeTransientNetworkIssue(errorMessage),
    }
  }

  return { ok: true as const, vote: data as AgentVote, operation: 'inserted' as const }
}
