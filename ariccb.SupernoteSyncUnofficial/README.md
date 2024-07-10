# Supernote Sync Unofficial

Supernote Sync Unofficial allows you to fetch and sync tasks from the Supernote E-Ink tablet by Ratta to NotePlan.

## Commands

### /fasl - Fetch all synced lines codes in NotePlan Notes
Prints all of the currently used codes for synced lines in NotePlan to ensure manually created synced lines are not conflicting.

### /s2n or /sns - Supernote to Noteplan Sync
Processes all of the Supernote .note files in your Supernote's Note directory and places recognized text and converted images into the appropriate NotePlan notes.

### /sts - Supernote Tasks Sync
Processes all of the Supernote's tasks and places them in today's NotePlan note, with a generated synced line code.

## Settings

### `supernote_tool_image_conversion_type`
-  **Type**: string
-  **Title**: Image format to use: either 'png' or 'pdf'
-  **Description**: The image files that get created from converting the .note files get embedded in the NotePlan notes. This setting determines the format of the image files.
-  **Default**: `png`
-  **Required**: true

### `notes_application_inbox_path`
-  **Type**: string
-  **Title**: Inbox Path
-  **Description**: Path to the inbox directory in the notes application that will be used to place notes that were in the parent folder of the Supernote notes.
-  **Default**: `/Users/acbouwers/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3/Notes/00 - Inbox`
-  **Required**: true

### `notes_application_file_ext`
-  **Type**: string
-  **Title**: File Extension
-  **Description**: File extension used for notes in the application.
-  **Default**: `.md`
-  **Required**: true

### `notes_application_storage_path`
-  **Type**: string
-  **Title**: Storage Path
-  **Description**: Path to the storage directory in the notes application.
-  **Default**: `/Users/acbouwers/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3/Notes`
-  **Required**: true

### `supernote_parent_storage_path`
-  **Type**: string
-  **Title**: Supernote Parent Storage Path
-  **Description**: Path to the parent storage directory in the Supernote application.
-  **Default**: `/Users/acbouwers/Library/Containers/5E209006-499F-43DC-BD7C-EC697B9B4D64/Data/Library/Application Support/com.ratta.supernote/677531935891181568`
-  **Required**: true

## Installation

1. Download the plugin from the [GitHub repository](https://github.com/NotePlan/plugins/blob/main/ariccb.SupernoteSyncUnofficial/README.md).
2. Place the plugin files in the NotePlan plugins directory.
3. Open NotePlan and navigate to the Plugin Console (NotePlan -> Help -> Plugin Console).
4. Ensure the plugin is listed and enabled.

## Changelog

For a detailed list of changes, please refer to the [changelog](https://github.com/NotePlan/plugins/blob/main/ariccb.SupernoteSyncUnofficial/CHANGELOG.md).

## References

For more information on NotePlan plugins, visit the [NotePlan Plugin Documentation](https://help.noteplan.co/article/67-create-command-bar-plugins).

---

*Note: This plugin is unofficial and is not affiliated with or endorsed by Ratta or Supernote.*
