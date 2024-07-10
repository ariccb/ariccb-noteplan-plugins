var exports = (function (exports) {
  "use strict";

  const pluginJson$2 = {
    "macOS.minVersion": "10.13.0",
    "noteplan.minAppVersion": "3.4.0",
    "plugin.id": "ariccb.SupernoteSyncUnofficial",
    "plugin.name": "Supernote Sync Unofficial",
    "plugin.version": "0.1.0",
    "plugin.lastUpdateInfo": "First release",
    "plugin.description": "Fetch and sync tasks from Supernote E-Ink tablet by Ratta to NotePlan",
    "plugin.author": "ariccb",
    "plugin.requiredFiles-EDIT_ME": [],
    "plugin.requiredFiles-NOTE": "If you want to use HTML windows, remove the '-EDIT_ME' above",
    "plugin.requiredSharedFiles": [],
    "plugin.dependencies": [],
    "plugin.script": "script.js",
    "plugin.url": "https://github.com/NotePlan/plugins/blob/main/ariccb.SupernoteSyncUnofficial/README.md",
    "plugin.changelog": "https://github.com/NotePlan/plugins/blob/main/ariccb.SupernoteSyncUnofficial/CHANGELOG.md",
    "plugin.commands": [
      {
        name: "Fetch all synced lines codes in NotePlan Notes",
        description:
          "prints all of the currently used codes for synced lines in NotePlan, to make sure manually created synced lines are not conflicting",
        jsFunction: "fetchAllSyncedLineCodes",
        alias: ["fasl"],
        hidden: true,
      },
      {
        name: "Supernote to Noteplan Sync",
        description:
          "Process all of the Supernote .note files in your Supernote's Note directory and place recognized text and converted images to the appropriate NotePlan notes",
        jsFunction: "supernoteToNotePlanSync",
        alias: ["s2n", "sns"],
        hidden: false,
      },
      {
        name: "Supernote Tasks Sync",
        description:
          "Process all of the Supernote's Tasks and place them in today's NotePlan note, with a generated synced line code",
        jsFunction: "insertDate",
        alias: ["sts"],
        hidden: false,
      },
    ],
    "plugin.settings": [
      {
        type: "string",
        key: "supernote_tool_image_conversion_type",
        title: "Image format to use: either 'png' or 'pdf'",
        description:
          "The image files that get created from converting the .note files get embedded in the NotePlan notes. This setting determines the format of the image files.",
        default: "png",
        required: true,
      },
      {
        type: "string",
        key: "notes_application_inbox_path",
        title: "Inbox Path",
        description:
          "Path to the inbox directory in the notes application that will be used to place notes that were in the parent folder of the Supernote notes.",
        default:
          "/Users/acbouwers/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3/Notes/00 - Inbox",
        required: true,
      },
      {
        type: "string",
        key: "notes_application_file_ext",
        title: "File Extension",
        description: "File extension used for notes in the application.",
        default: ".md",
        required: true,
      },
      {
        type: "string",
        key: "notes_application_storage_path",
        title: "Storage Path",
        description: "Path to the storage directory in the notes application.",
        default:
          "/Users/acbouwers/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3/Notes",
        required: true,
      },
      {
        type: "string",
        key: "supernote_parent_storage_path",
        title: "Supernote Parent Storage Path",
        description: "Path to the parent storage directory in the Supernote application.",
        default:
          "/Users/acbouwers/Library/Containers/5E209006-499F-43DC-BD7C-EC697B9B4D64/Data/Library/Application Support/com.ratta.supernote/677531935891181568",
        required: true,
      },
    ],
  };

  const fs = require("fs");
  const path = require("path");
  const supernote = require("supernote-typescript");

  async function fetchAllSyncedLineCodes() {
    // prints a list of all the synced lines codes
    const referencedBlocks = DataStore.referencedBlocks();
    const syncLines = referencedBlocks.map((block) => block.content.split("^")[1].substring(0, 6));

    // Define the path to the output file
    const outputDir = path.join(DataStore.pluginFolder(), "ariccb.SupernoteSyncUnofficial");
    const outputFile = path.join(outputDir, "syncedLines.json");

    // Make sure the directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert the sync lines array to JSON format
    const syncLinesJson = JSON.stringify(syncLines, null, 2);

    // Write the JSON string to the file
    fs.writeFileSync(outputFile, syncLinesJson, "utf8");

    // Optionally output to the console for verification
    console.log(`Synced lines saved to ${outputFile}`);
  }

  async function supernoteToNotePlanSync() {
    const settings = DataStore.settings;

    const supernoteParentStoragePath = settings.supernote_parent_storage_path;
    const supernotePath = path.join(supernoteParentStoragePath, "Supernote", "Note");
    const supernoteToolImageConversionType = settings.supernote_tool_image_conversion_type; // Set this to either "png" or "pdf"
    const notesApplicationStoragePath = settings.notes_application_storage_path;
    const notesApplicationFileExt = settings.notes_application_file_ext;
    const notesApplicationInboxPath = settings.notes_application_inbox_path;
    const notesApplicationAttachmentSuffix = "_attachments";
    const returnLine = "\n";

    const failedConversions = [];
    const successfulConversions = [];

    function getFileId(filePath) {
      const content = fs.readFileSync(filePath);
      const match = content.toString().match(/<FILE_ID:(.*?)>/);
      return match ? match[1] : null;
    }

    function findExistingMarkdown(fileId) {
      const files = fs.readdirSync(notesApplicationStoragePath, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile() && file.name.endsWith(notesApplicationFileExt)) {
          const filePath = path.join(notesApplicationStoragePath, file.name);
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            if (content.includes(fileId)) {
              return filePath;
            }
          } catch (error) {
            console.error(`Warning: Unable to read ${filePath}. Skipping.`, error);
          }
        }
      }
      return null;
    }

    async function extractTextFromNote(noteFilePath, textOutputPath) {
      try {
        const result = await supernote.convert({
          input: noteFilePath,
          output: textOutputPath,
          format: "txt",
        });
        if (fs.existsSync(textOutputPath) && fs.statSync(textOutputPath).size > 0) {
          console.log(`Text extracted successfully to ${textOutputPath}`);
          return true;
        } else {
          console.log(`Text extraction produced an empty file for ${noteFilePath}`);
          return false;
        }
      } catch (error) {
        console.error(`Error extracting text from ${noteFilePath}:`, error);
        return false;
      }
    }

    function createNewMarkdownFile(filePath, noteFileNameWithoutExt, noteTags, formattedNoteCreatedDate) {
      const content = `---${returnLine}title: ${noteFileNameWithoutExt} ${returnLine}aliases:${returnLine}tags: #${noteTags}${returnLine}created: ${formattedNoteCreatedDate}${returnLine}---${returnLine}#### Source:${returnLine}#### Next:${returnLine}#### Branch:${returnLine}#### ---${returnLine}- [ ] File Incoming SuperNote ${noteFileNameWithoutExt} >today${returnLine}${returnLine}## Supernote Sync - Do Not Edit Below This Line${returnLine}---${returnLine}### Supernote Text Recognition Results${returnLine}${returnLine}### SuperNote Exported Images${returnLine}`;
      fs.writeFileSync(filePath, content, "utf-8");
    }

    function updateExistingMarkdownFile(filePath) {
      let content = fs.readFileSync(filePath, "utf-8");
      const syncStart = content.indexOf("## Supernote Sync - Do Not Edit Below This Line");
      if (syncStart !== -1) {
        content = content.slice(0, syncStart);
      }
      content += `${returnLine}${returnLine}## Supernote Sync - Do Not Edit Below This Line${returnLine}---${returnLine}### Supernote Text Recognition Results${returnLine}${returnLine}### SuperNote Exported Images${returnLine}`;
      fs.writeFileSync(filePath, content, "utf-8");
    }

    function appendNewText(markdownFile, newText) {
      let content = fs.readFileSync(markdownFile, "utf-8");
      const startPosition = content.indexOf("### Supernote Text Recognition Results");
      const endPosition = content.indexOf("### SuperNote Exported Images");
      if (startPosition !== -1 && endPosition !== -1) {
        content =
          content.slice(0, startPosition + "### Supernote Text Recognition Results\n\n".length) +
          newText +
          "\n\n" +
          content.slice(endPosition);
      } else {
        content += `\n\n### Supernote Text Recognition Results\n\n${newText}\n\n### SuperNote Exported Images\n`;
      }
      fs.writeFileSync(markdownFile, content, "utf-8");
    }

    function appendErrorMessage(markdownFile, errorMessage, section) {
      let content = fs.readFileSync(markdownFile, "utf-8");
      const insertPosition = content.indexOf(section);
      if (insertPosition !== -1) {
        content =
          content.slice(0, insertPosition + section.length + 2) +
          errorMessage +
          "\n\n" +
          content.slice(insertPosition + section.length + 2);
      } else {
        content += `\n\n${section}\n\n${errorMessage}`;
      }
      fs.writeFileSync(markdownFile, content, "utf-8");
    }

    async function convertNoteToImages(noteFilePath, outputFolder, fileId) {
      const maxAttempts = 100;
      const generatedFiles = [];
      for (let page = 0; page < maxAttempts; page++) {
        const outputFilePath = path.join(outputFolder, `${fileId}_${page}.${supernoteToolImageConversionType}`);
        try {
          await supernote.convert({
            input: noteFilePath,
            output: outputFilePath,
            format: supernoteToolImageConversionType,
          });
          if (fs.existsSync(outputFilePath)) {
            generatedFiles.push(outputFilePath);
          } else {
            break;
          }
        } catch (error) {
          console.error(`Error converting ${noteFilePath} to ${supernoteToolImageConversionType.toUpperCase()}:`, error);
          break;
        }
      }
      return generatedFiles;
    }

    function appendImageReferences(markdownFile, imageReferences) {
      let content = fs.readFileSync(markdownFile, "utf-8");
      const startPosition = content.indexOf("### SuperNote Exported Images");
      if (startPosition !== -1) {
        content = content.slice(0, startPosition + "### SuperNote Exported Images\n".length) + imageReferences.join("\n") + "\n";
      } else {
        content += `\n\n### SuperNote Exported Images\n${imageReferences.join("\n")}\n`;
      }
      fs.writeFileSync(markdownFile, content, "utf-8");
    }

    function syncNoteToCorrectFolder(noteFile, fileId, noteFileNameWithoutExt, noteCreatedDate) {
      const relativePath = path.relative(supernotePath, noteFile);
      const noteFolder = path.dirname(relativePath);
      const noteFolderPath = path.join(notesApplicationStoragePath, noteFolder);
      if (!fs.existsSync(noteFolderPath)) {
        fs.mkdirSync(noteFolderPath, { recursive: true });
      }
      const newMarkdownFilePath = path.join(noteFolderPath, `${noteFileNameWithoutExt}${notesApplicationFileExt}`);
      const noteTags = noteFolder.replace(/ /g, "").toLowerCase().replace(/\//g, "/");
      const formattedNoteCreatedDate = noteCreatedDate.toISOString().split("T")[0];
      createNewMarkdownFile(newMarkdownFilePath, noteFileNameWithoutExt, noteTags, formattedNoteCreatedDate);
      return newMarkdownFilePath;
    }

    const noteFiles = fs
      .readdirSync(supernotePath, { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith(".note"))
      .map((file) => path.join(supernotePath, file.name));

    for (const noteFile of noteFiles) {
      console.log(`\nProcessing file: ${noteFile}`);
      const fileId = getFileId(noteFile);
      if (!fileId) {
        console.warn(`Warning: Could not find FILE_ID in ${noteFile}. Skipping.`);
        failedConversions.push(noteFile);
        continue;
      }

      const noteFileNameWithoutExt = path.basename(noteFile, ".note").trim();
      const noteCreatedDate = new Date(fs.statSync(noteFile).ctime);

      let existingMarkdownFile = findExistingMarkdown(fileId);
      if (!existingMarkdownFile) {
        existingMarkdownFile = syncNoteToCorrectFolder(noteFile, fileId, noteFileNameWithoutExt, noteCreatedDate);
      } else {
        updateExistingMarkdownFile(existingMarkdownFile);
      }

      const attachmentsPath = existingMarkdownFile.replace(notesApplicationFileExt, notesApplicationAttachmentSuffix);
      if (!fs.existsSync(attachmentsPath)) {
        console.log(`Creating new folder: ${attachmentsPath}`);
        fs.mkdirSync(attachmentsPath, { recursive: true });
      }

      const textOutputPath = path.join(attachmentsPath, `${fileId}_text.txt`);
      let textExtracted = await extractTextFromNote(noteFile, textOutputPath);
      if (!textExtracted) {
        console.log(`Retrying text extraction for ${noteFile}`);
        textExtracted = await extractTextFromNote(noteFile, textOutputPath);
        if (!textExtracted) {
          const errorMessage = `This .note file was not created using the Real-Time Recognition file type, so no text was able to be output\n${noteFile}`;
          appendErrorMessage(existingMarkdownFile, errorMessage, "### Supernote Text Recognition Results");
          console.error(`Failed to extract text from ${noteFile} after retrying`);
          failedConversions.push(noteFile);
          continue;
        }
      }

      if (textExtracted && fs.existsSync(textOutputPath)) {
        const newText = fs.readFileSync(textOutputPath, "utf-8");
        if (newText.trim()) {
          appendNewText(existingMarkdownFile, newText);
          console.log(`Updated text for ${noteFileNameWithoutExt}`);
          console.log(JSON.stringify({ text_recognition_results: newText }));
        } else {
          console.log(`Extracted text is empty for ${noteFileNameWithoutExt}`);
        }
      } else {
        console.log(`Text file not created for ${noteFileNameWithoutExt}`);
      }

      console.log(`Attempting to convert ${noteFile} to ${supernoteToolImageConversionType.toUpperCase()}`);
      let generatedFiles = await convertNoteToImages(noteFile, attachmentsPath, fileId);
      if (!generatedFiles.length) {
        console.log(`Retrying image conversion for ${noteFile}`);
        generatedFiles = await convertNoteToImages(noteFile, attachmentsPath, fileId);
        if (!generatedFiles.length) {
          const errorMessage = `The .note file conversion to images failed for some reason. Error output: ${noteFile}`;
          appendErrorMessage(existingMarkdownFile, errorMessage, "### SuperNote Exported Images");
          console.error(`Failed to convert ${noteFile} to ${supernoteToolImageConversionType.toUpperCase()} after retrying`);
          failedConversions.push(noteFile);
          continue;
        }
      }

      console.log(`Successfully converted ${noteFileNameWithoutExt} to ${supernoteToolImageConversionType.toUpperCase()}`);

      const imageReferences = generatedFiles.map((fileName) => {
        const relativePath = `${noteFileNameWithoutExt}_attachments/${path.basename(fileName)}`;
        return `![image](${relativePath})`;
      });

      if (imageReferences.length) {
        appendImageReferences(existingMarkdownFile, imageReferences);
        console.log(
          `Added ${
            imageReferences.length
          } ${supernoteToolImageConversionType.toUpperCase()} references to ${existingMarkdownFile}`
        );
      } else {
        console.log(`No ${supernoteToolImageConversionType.toUpperCase()} files were found for ${noteFileNameWithoutExt}`);
      }

      successfulConversions.push(noteFile);
      console.log(`Finished processing ${noteFile}`);
      console.log("-----------------------------------");
    }

    console.log("\nConversion Summary:");
    console.log(`Total files processed: ${noteFiles.length}`);
    console.log(`Successful conversions: ${successfulConversions.length}`);
    console.log(`Failed conversions: ${failedConversions.length}`);

    if (failedConversions.length) {
      console.log("\nThe following files failed conversion:");
      for (const file of failedConversions) {
        console.log(file);
      }
    } else {
      console.log("\nAll files were converted successfully.");
    }

    console.log("Script completed.");
  }

  async function onUpdateOrInstall() {
    try {
      console.log(`${pluginJson$2["plugin.id"]}: onUpdateOrInstall running`);
      const updateSettings = updateSettingData(pluginJson$2);
      console.log(`${pluginJson$2["plugin.id"]}: onUpdateOrInstall updateSettingData code: ${updateSettings}`);
    } catch (error) {
      console.error(error);
    }
    console.log(`${pluginJson$2["plugin.id"]}: onUpdateOr Install finished`);
  }

  exports.fetchAllSyncedLineCodes = fetchAllSyncedLineCodes;
  exports.onSettingsUpdated = onSettingsUpdated;
  exports.onUpdateOrInstall = onUpdateOrInstall;
  exports.supernoteToNotePlanSync = supernoteToNotePlanSync;

  Object.defineProperty(exports, "__esModule", {
    value: true,
  });

  return exports;
})({});

Object.assign(typeof globalThis == "undefined" ? this : globalThis, exports);
