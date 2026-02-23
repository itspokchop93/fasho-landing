const MAILERLITE_API_BASE = 'https://connect.mailerlite.com/api';

function getApiKey(): string {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    throw new Error('MAILERLITE_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

export interface MailerLiteGroup {
  id: string;
  name: string;
  active_count: number;
  sent_count: number;
  opens_count: number;
  open_rate: { float: number; string: string };
  clicks_count: number;
  click_rate: { float: number; string: string };
  unsubscribed_count: number;
  unconfirmed_count: number;
  bounced_count: number;
  junk_count: number;
  created_at: string;
}

export interface MailerLiteSubscriberPayload {
  email: string;
  fields?: {
    name?: string;
    last_name?: string;
    z_i_p?: string;
    [key: string]: string | undefined;
  };
  groups?: string[];
  status?: string;
}

export interface MailerLitePushResult {
  success: boolean;
  statusCode: number;
  data?: any;
  errorMessage?: string;
  subscriberId?: string;
}

export async function fetchGroups(): Promise<{ success: boolean; groups: MailerLiteGroup[]; error?: string }> {
  try {
    const response = await fetch(`${MAILERLITE_API_BASE}/groups?limit=1000`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('MailerLite fetchGroups error:', response.status, errorBody);
      return { success: false, groups: [], error: `MailerLite API error (${response.status}): ${errorBody}` };
    }

    const result = await response.json();
    return { success: true, groups: result.data || [] };
  } catch (err: any) {
    console.error('MailerLite fetchGroups exception:', err);
    return { success: false, groups: [], error: err.message || 'Unknown error fetching groups' };
  }
}

export async function upsertSubscriber(payload: MailerLiteSubscriberPayload): Promise<MailerLitePushResult> {
  try {
    console.log('📬 MAILERLITE: Upserting subscriber:', payload.email);

    const response = await fetch(`${MAILERLITE_API_BASE}/subscribers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const statusCode = response.status;
    const body = await response.json();

    if (statusCode === 200 || statusCode === 201) {
      console.log('📬 MAILERLITE: Subscriber upserted successfully:', body.data?.id);
      return {
        success: true,
        statusCode,
        data: body.data,
        subscriberId: body.data?.id,
      };
    }

    const errorMessage = body.message || body.errors
      ? `${body.message || 'Validation error'}${body.errors ? ': ' + JSON.stringify(body.errors) : ''}`
      : `HTTP ${statusCode}`;

    console.error('📬 MAILERLITE: Subscriber upsert failed:', errorMessage);
    return {
      success: false,
      statusCode,
      errorMessage,
      data: body,
    };
  } catch (err: any) {
    console.error('📬 MAILERLITE: Subscriber upsert exception:', err);
    return {
      success: false,
      statusCode: 0,
      errorMessage: err.message || 'Network error',
    };
  }
}

export interface PushSubscriberParams {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  zip?: string;
  groupIds: string[];
  groupNames: string[];
  source: string;
}

export async function pushSubscriberToMailerLite(
  params: PushSubscriberParams,
  supabaseAdmin: any
): Promise<MailerLitePushResult> {
  const { email, firstName, lastName, fullName, zip, groupIds, groupNames, source } = params;

  let resolvedFirst = firstName || '';
  let resolvedLast = lastName || '';

  if (!resolvedFirst && fullName) {
    const parts = fullName.trim().split(/\s+/);
    resolvedFirst = parts[0] || '';
    resolvedLast = parts.slice(1).join(' ') || '';
  }

  const payload: MailerLiteSubscriberPayload = {
    email,
    fields: {
      name: resolvedFirst,
      last_name: resolvedLast,
      ...(zip ? { z_i_p: zip } : {}),
    },
    groups: groupIds,
  };

  const result = await upsertSubscriber(payload);

  try {
    await supabaseAdmin.from('mailerlite_sync_history').insert({
      email,
      full_name: fullName || `${resolvedFirst} ${resolvedLast}`.trim(),
      first_name: resolvedFirst,
      last_name: resolvedLast,
      zip: zip || null,
      source,
      group_ids: groupIds,
      group_names: groupNames,
      status: result.success ? 'success' : 'failed',
      status_code: result.statusCode,
      error_message: result.errorMessage || null,
      mailerlite_subscriber_id: result.subscriberId || null,
    });
  } catch (logErr) {
    console.error('📬 MAILERLITE: Failed to log sync history:', logErr);
  }

  return result;
}

export async function getActiveGroupIds(supabaseAdmin: any): Promise<{ groupIds: string[]; groupNames: string[] }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('mailerlite_config')
      .select('group_id, group_name')
      .eq('is_active', true);

    if (error) {
      console.error('📬 MAILERLITE: Error fetching active groups:', error);
      return { groupIds: [], groupNames: [] };
    }

    return {
      groupIds: (data || []).map((g: any) => g.group_id),
      groupNames: (data || []).map((g: any) => g.group_name),
    };
  } catch (err) {
    console.error('📬 MAILERLITE: Exception fetching active groups:', err);
    return { groupIds: [], groupNames: [] };
  }
}
