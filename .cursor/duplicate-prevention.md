# Cursor AI Duplicate File Prevention

## Problem
AI assistants in Cursor (particularly Claude) have been creating duplicate files with "2" suffix (e.g., `search 2.ts`, `order 2.ts`) which break the website by creating conflicting API routes.

## Root Causes
1. **Tool Execution Limits**: 25 tool call limit per request causes duplicates when limit is reached
2. **File Edit Conflicts**: Failed edits create new files instead of retrying properly
3. **Context Window Issues**: Long conversations cause AI to lose track of existing files
4. **Tool Call Failures**: Timeouts and failures trigger duplicate file creation

## Prevention Rules

### For Users:
1. **Keep conversations short** - Start new chats for different tasks
2. **Avoid large batch operations** - Break down big tasks into smaller chunks
3. **Monitor file changes** - Check git status frequently for unexpected duplicates
4. **Use specific file paths** - Always specify exact file paths when editing

### For AI Assistants:
1. **Never create files with number suffixes** (e.g., "2", "3", etc.)
2. **Always check if file exists before creating**
3. **Use search_replace or edit tools instead of creating new files**
4. **If edit fails, retry the same file, don't create new one**
5. **Prefer editing existing files over creating new ones**

## Detection & Cleanup

### Find Duplicate Files:
```bash
find src/ -name "* 2.*" -type f
```

### Find Duplicate Directories:
```bash
find src/ -type d -name "* 2" -o -name "*2"
```

### Delete All Duplicate Files:
```bash
find src/ -name "* 2.*" -type f -delete
```

### Delete All Duplicate Directories:
```bash
find src/ -type d -name "* 2" -exec rm -rf {} \;
find src/ -type d -name "*2" -exec rm -rf {} \;

## Emergency Cleanup Script
```bash
#!/bin/bash
echo "🔍 Finding duplicate files and directories..."

# Check for duplicate files
duplicates_files=$(find src/ -name "* 2.*" -type f)
# Check for duplicate directories  
duplicates_dirs=$(find src/ -type d -name "* 2" -o -name "*2")

if [ -n "$duplicates_files" ] || [ -n "$duplicates_dirs" ]; then
    if [ -n "$duplicates_files" ]; then
        echo "Found duplicate files:"
        echo "$duplicates_files"
        find src/ -name "* 2.*" -type f -delete
    fi
    
    if [ -n "$duplicates_dirs" ]; then
        echo "Found duplicate directories:"
        echo "$duplicates_dirs"
        find src/ -type d -name "* 2" -exec rm -rf {} \; 2>/dev/null
        find src/ -type d -name "*2" -exec rm -rf {} \; 2>/dev/null
    fi
    
    echo "✅ Cleanup complete"
else
    echo "✅ No duplicates found"
fi
```

## Last Updated
Date: $(date)
Issue: Spotify search API was broken due to duplicate `search 2.ts` file
Resolution: All duplicate files deleted, API restored