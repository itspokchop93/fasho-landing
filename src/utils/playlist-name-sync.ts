import { SupabaseClient } from '@supabase/supabase-js';

/**
 * When a playlist's name changes in playlist_network, update the name
 * in every marketing_campaigns.playlist_assignments JSONB entry that
 * references it (matched by playlist id).
 *
 * Returns the number of campaign rows that were updated.
 */
export async function propagatePlaylistNameChange(
  supabase: SupabaseClient,
  playlistId: string,
  newName: string
): Promise<number> {
  try {
    const { data: campaigns, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select('id, playlist_assignments')
      .not('playlist_assignments', 'is', null);

    if (fetchError || !campaigns) {
      console.error('Failed to fetch campaigns for name propagation:', fetchError);
      return 0;
    }

    let updatedCount = 0;

    for (const campaign of campaigns) {
      const assignments = campaign.playlist_assignments;
      if (!Array.isArray(assignments)) continue;

      let changed = false;
      const updatedAssignments = assignments.map((a: any) => {
        if (a.id === playlistId && a.name !== newName) {
          changed = true;
          return { ...a, name: newName };
        }
        return a;
      });

      if (changed) {
        const { error: updateError } = await supabase
          .from('marketing_campaigns')
          .update({ playlist_assignments: updatedAssignments })
          .eq('id', campaign.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`Failed to update campaign ${campaign.id} playlist assignments:`, updateError);
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('Error propagating playlist name change:', error);
    return 0;
  }
}
