import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {PublishWithDateAction} from './actions/publishWithDate'

export default defineConfig({
  name: 'fasho-blog',
  title: 'Fasho Blog',

  projectId: 'vwqzooxn',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => {
      // Replace the default publish action with our custom one for posts
      if (context.schemaType === 'post') {
        return prev.map((action) => 
          action.action === 'publish' ? PublishWithDateAction : action
        )
      }
      return prev
    },
  },
})
