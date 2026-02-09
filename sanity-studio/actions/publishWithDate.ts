// Custom publish action that automatically sets publishedAt if empty
import {useDocumentOperation} from 'sanity'
import {useState} from 'react'

interface DocumentOperations {
  publish: {
    disabled: boolean | string
    execute: () => void
  }
  patch: {
    execute: (patches: Array<{set: Record<string, unknown>}>) => void
  }
}

export function PublishWithDateAction(props: {
  id: string
  type: string
  draft: {publishedAt?: string} | null
  published: {publishedAt?: string} | null
  onComplete: () => void
}) {
  const {draft, published, onComplete} = props
  const {publish, patch} = useDocumentOperation(props.id, props.type) as DocumentOperations
  const [isPublishing, setIsPublishing] = useState(false)

  // Only apply to 'post' type
  if (props.type !== 'post') {
    return null
  }

  return {
    disabled: publish.disabled || isPublishing,
    label: isPublishing ? 'Publishing…' : 'Publish',
    onHandle: async () => {
      setIsPublishing(true)

      // Check if publishedAt is empty in draft
      const draftPublishedAt = draft?.publishedAt
      const publishedPublishedAt = published?.publishedAt

      // If publishedAt is not set, set it to now
      if (!draftPublishedAt && !publishedPublishedAt) {
        // Set publishedAt to current time
        patch.execute([{set: {publishedAt: new Date().toISOString()}}])
      }

      // Then publish
      publish.execute()
      
      // Signal completion
      onComplete()
    },
  }
}
