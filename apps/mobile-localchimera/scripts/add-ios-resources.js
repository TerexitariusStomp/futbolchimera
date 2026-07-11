const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
const projectName = (appJson.expo.name || 'LocalChimera').replace(/[^a-zA-Z0-9]/g, '');

const pbxprojPath = path.join(projectRoot, 'ios', `${projectName}.xcodeproj`, 'project.pbxproj');
const resourcesDir = path.join(projectRoot, 'ios', projectName, 'Resources');

if (!fs.existsSync(pbxprojPath)) { console.error('pbxproj not found'); process.exit(1); }
if (!fs.existsSync(resourcesDir)) { console.error('Resources dir not found'); process.exit(1); }

let pbx = fs.readFileSync(pbxprojPath, 'utf8');

// Get all entries in Resources dir (both files and directories)
const entries = fs.readdirSync(resourcesDir).map(f => {
  const fullPath = path.join(resourcesDir, f);
  const stat = fs.statSync(fullPath);
  return { name: f, isDir: stat.isDirectory(), isFile: stat.isFile() };
});

// Find existing file references to avoid duplicates
const existingRefs = new Set();
const buildFileRegex = /\/\*\s+(\S+)\s+in Resources\s+\*\//g;
let m;
while ((m = buildFileRegex.exec(pbx)) !== null) {
  existingRefs.add(m[1]);
}
const refPathRegex = new RegExp(`path = "${projectName}/Resources/([^"]+)"`, 'g');
while ((m = refPathRegex.exec(pbx)) !== null) {
  existingRefs.add(m[1]);
}

// Find the Resources build phase
const buildPhaseRegex = /13B07F8E1A680F5B00A75B9A \/\* Resources \*\/ = \{\s*isa = PBXResourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \(([\s\S]*?)\);/;
const buildPhaseMatch = pbx.match(buildPhaseRegex);
if (!buildPhaseMatch) { console.error('Resources build phase not found'); process.exit(1); }

let filesContent = buildPhaseMatch[1];
const newFileRefs = [];
const newBuildFiles = [];

for (const entry of entries) {
  if (existingRefs.has(entry.name)) {
    console.log(`Already exists: ${entry.name}`);
    continue;
  }

  const fileRefId = Array.from({ length: 24 }, () => 'ABCDEF0123456789'[Math.floor(Math.random() * 16)]).join('');
  const buildFileId = Array.from({ length: 24 }, () => 'ABCDEF0123456789'[Math.floor(Math.random() * 16)]).join('');

  if (entry.isDir) {
    // Add as folder reference (lastKnownFileType = folder)
    newFileRefs.push(`\t\t${fileRefId} /* ${entry.name} */ = {isa = PBXFileReference; lastKnownFileType = folder; name = ${entry.name}; path = "${projectName}/Resources/${entry.name}"; sourceTree = "<group>"; };`);
    newBuildFiles.push(`\t\t${buildFileId} /* ${entry.name} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* ${entry.name} */; };`);
    filesContent += `\n\t\t\t\t${buildFileId} /* ${entry.name} in Resources */,`;
    console.log(`Added folder: ${entry.name}`);
  } else if (entry.isFile) {
    newFileRefs.push(`\t\t${fileRefId} /* ${entry.name} */ = {isa = PBXFileReference; lastKnownFileType = file; name = ${entry.name}; path = "${projectName}/Resources/${entry.name}"; sourceTree = "<group>"; };`);
    newBuildFiles.push(`\t\t${buildFileId} /* ${entry.name} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* ${entry.name} */; };`);
    filesContent += `\n\t\t\t\t${buildFileId} /* ${entry.name} in Resources */,`;
    console.log(`Added file: ${entry.name}`);
  }
}

if (newFileRefs.length === 0) {
  console.log('All entries already in project.');
  process.exit(0);
}

// Insert PBXBuildFile entries before the "End PBXBuildFile section" marker
pbx = pbx.replace(/\/\* End PBXBuildFile section \*\//, newBuildFiles.join('\n') + '\n/* End PBXBuildFile section */');

// Insert PBXFileReference entries before the "End PBXFileReference section" marker
pbx = pbx.replace(/\/\* End PBXFileReference section \*\//, newFileRefs.join('\n') + '\n/* End PBXFileReference section */');

// Update the build phase files list
pbx = pbx.replace(buildPhaseMatch[1], filesContent);

// Add file refs to the project's main group children
const groupRegex = new RegExp(`(13B07F9E1A680F5B00A75B9A)/\\*\\s*${projectName}\\s*\\*/ = {[\\s\\S]*?children = \\(([\\s\\S]*?)\\);/;`);
const groupMatch = pbx.match(groupRegex);
if (groupMatch) {
  let children = groupMatch[2];
  for (const entry of entries) {
    const refLine = newFileRefs.find(r => r.includes(`/* ${entry.name} */`));
    if (refLine) {
      const id = refLine.split(' ')[0].trim();
      children += `\n\t\t\t\t${id} /* ${entry.name} */,`;
    }
  }
  pbx = pbx.replace(groupMatch[2], children);
}

fs.writeFileSync(pbxprojPath, pbx);
console.log(`Added ${newFileRefs.length} entries to Xcode project.`);
