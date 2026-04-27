import { existsSync } from 'fs';
import { join } from 'path';

export default async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context;

  let skillsDir;
  if (electronPlatformName === 'darwin') {
    const appPath = join(appOutDir, `${context.packager.appInfo.productFilename}.app`);
    skillsDir = join(appPath, 'Contents/Resources/app.asar.unpacked/out/.agents/skills');
  } else {
    skillsDir = join(appOutDir, 'resources/app.asar.unpacked/out/.agents/skills');
  }

  if (existsSync(skillsDir)) {
    console.log('.agents/skills directory found at:', skillsDir);
    if (electronPlatformName === 'darwin') {
      console.log('  → electron-builder will codesign binaries automatically');
    }
  } else {
    console.warn('.agents/skills directory not found at expected location:', skillsDir);
  }
}
