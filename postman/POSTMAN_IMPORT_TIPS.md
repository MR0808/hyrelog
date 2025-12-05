# Postman Collection Import Troubleshooting

## How to Get Detailed Error Messages from Postman

### Method 1: Postman Desktop App

1. Open Postman Desktop App
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `HyreLog.postman_collection.json`
5. If there's an error, Postman will show:
    - The exact error message
    - The line number where the error occurred
    - Sometimes a preview of the problematic section

### Method 2: Postman Web App

1. Go to https://web.postman.co
2. Click **Import** (left sidebar)
3. Drag and drop the JSON file or click to browse
4. Check the **Import Results** panel for detailed errors

### Method 3: Validate Before Import

Run the validation script:

```bash
cd postman
node validate.mjs
```

This will:

-   Check if JSON is valid
-   Verify schema version
-   Check for common issues (like `{{base_url}}` in host fields)
-   Show line numbers for any errors

### Method 4: Use Online JSON Validator

1. Copy the contents of `HyreLog.postman_collection.json`
2. Paste into https://jsonlint.com or https://jsonformatter.org
3. These tools will show exact error locations

## Common Postman Import Errors

### "We don't recognize/support this format"

-   **Cause**: Invalid JSON syntax or unsupported schema version
-   **Fix**: Run `node fix-postman-collection.js` to fix common issues

### "Invalid collection format"

-   **Cause**: Missing required fields or incorrect structure
-   **Fix**: Check that all requests have `method`, `url`, and `header` fields

### "Variable not found"

-   **Cause**: Environment variables referenced but not defined
-   **Fix**: Import `HyreLog.postman_environment.json` first, or create environment manually

## Current Status

✅ JSON syntax is valid
✅ Schema version: v2.0.0
✅ All host fields are empty (variables only in `raw` URLs)
✅ Collection structure is correct

If you still get an error, please share:

1. The exact error message from Postman
2. The line number (if provided)
3. Whether you're using Postman Desktop or Web
